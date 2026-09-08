import { z } from 'zod';
import { generateJson } from '@/lib/ai';
import { extractIdentifiers, type CategorySlug } from '@/pipeline/parser';
import type { Draft } from '@/pipeline/generate';
import type { ResearchSource } from '@/pipeline/research';

/**
 * Step 6 — quality gate.
 *
 * Two independent checks, in this order:
 *
 *   1. A deterministic scan for hallucinated identifiers. This is pure string
 *      work — no model involved — because it is the check that must not be
 *      talked out of its answer. Any KB number, build number or error code in
 *      the draft that does not appear in the sources or the verified list is a
 *      hard block, whatever the score says.
 *
 *   2. A model-scored review of accuracy, structure and thinness.
 *
 * The publish decision reads `blocked` first and `score` second. A blocked
 * draft never auto-publishes, at any score.
 */

/**
 * The scoring rubric, which differs by content type.
 *
 * The field descriptions are sent to the model as part of the structured-output
 * schema, so they *are* the rubric — a general-interest article graded against
 * "per-method H2s, numbered steps, 'If nothing worked'" loses marks for omitting
 * a structure it was correctly instructed not to produce, and the same goes for
 * a safety dimension about destructive steps in an article that has none. Both
 * used to be applied to every post regardless of vertical, which pushed sport,
 * travel and money drafts below the auto-publish threshold for no real fault.
 */
function buildScoreSchema(isTroubleshooting: boolean) {
  return z.object({
    accuracy: z
      .number()
      .int()
      .min(0)
      .max(40)
      .describe('0-40. Is every claim supported by the sources?'),
    structure: z
      .number()
      .int()
      .min(0)
      .max(25)
      .describe(
        isTroubleshooting
          ? '0-25. Quick answer, per-method H2s, numbered steps, "If nothing worked", FAQ.'
          : '0-25. Quick answer, an introduction, H2 sections, at least one list, a ' +
              'conclusion that ends with a clear call to action, and an FAQ.',
      ),
    usefulness: z
      .number()
      .int()
      .min(0)
      .max(25)
      .describe(
        isTroubleshooting
          ? '0-25. Does it actually resolve the problem, or restate it?'
          : '0-25. Does the reader finish knowing something they did not, or does it ' +
              'restate the headline and pad?',
      ),
    safety: z
      .number()
      .int()
      .min(0)
      .max(10)
      .describe(
        isTroubleshooting
          ? '0-10. Are destructive steps warned about, and ordered last?'
          : '0-10. Are figures, dates and claims attributed, and is speculation marked ' +
              'as speculation rather than stated as fact?',
      ),
    notes: z
      .string()
      .min(30)
      .max(1200)
      .describe('What is wrong and what a human should check before publishing. Be specific.'),
    unsupportedClaims: z
      .array(z.string())
      .max(10)
      .describe('Quote any claim you could not trace to a source. Empty if none.'),
  });
}

/** The troubleshooting rubric. Kept as the exported shape — the two are structurally identical. */
export const ScoreSchema = buildScoreSchema(true);

export type Score = z.infer<typeof ScoreSchema>;

export interface IdentifierAudit {
  blocked: boolean;
  hallucinated: { kbNumbers: string[]; buildNumbers: string[]; errorCodes: string[] };
}

export interface QualityResult {
  score: number;
  notes: string;
  blocked: boolean;
  audit: IdentifierAudit;
  breakdown: Score | null;
}

/**
 * Deterministic identifier check. Pure — no I/O — so it is directly unit
 * testable and cannot fail open on a network error.
 */
export function auditIdentifiers(
  draft: Pick<Draft, 'title' | 'quickAnswer' | 'body' | 'affectedBuilds' | 'faq' | 'metaDescription'>,
  sourceText: string,
  verifiedIdentifiers: string[],
): IdentifierAudit {
  const draftText = [
    draft.title,
    draft.quickAnswer,
    draft.body,
    draft.metaDescription,
    draft.affectedBuilds.join(' '),
    draft.faq.map((f) => `${f.question} ${f.answer}`).join(' '),
  ].join('\n');

  const inDraft = extractIdentifiers(draftText);
  const inSources = extractIdentifiers(sourceText);
  const verified = extractIdentifiers(verifiedIdentifiers.join(' '));

  const allowed = {
    kbNumbers: new Set([...inSources.kbNumbers, ...verified.kbNumbers].map(normalise)),
    buildNumbers: new Set([...inSources.buildNumbers, ...verified.buildNumbers].map(normalise)),
    errorCodes: new Set([...inSources.errorCodes, ...verified.errorCodes].map(normalise)),
  };

  const hallucinated = {
    kbNumbers: inDraft.kbNumbers.filter((v) => !allowed.kbNumbers.has(normalise(v))),
    // A build appearing as "26100" when the source says "26100.2314" is the same
    // build family, so a bare major matches any revision of it in the sources.
    buildNumbers: inDraft.buildNumbers.filter((v) => !buildIsAllowed(v, allowed.buildNumbers)),
    errorCodes: inDraft.errorCodes.filter((v) => !allowed.errorCodes.has(normalise(v))),
  };

  return {
    blocked:
      hallucinated.kbNumbers.length > 0 ||
      hallucinated.buildNumbers.length > 0 ||
      hallucinated.errorCodes.length > 0,
    hallucinated,
  };
}

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

function buildIsAllowed(value: string, allowed: Set<string>) {
  const v = normalise(value);
  if (allowed.has(v)) return true;
  const major = v.split('.')[0];
  for (const candidate of allowed) {
    if (candidate === major || candidate.split('.')[0] === major) return true;
  }
  return false;
}

/** Runs the deterministic audit, then the scored review. */
export async function runQualityGate({
  draft,
  sources,
  verifiedIdentifiers,
  keywordPhrase,
  categorySlug = 'windows',
}: {
  draft: Draft;
  sources: ResearchSource[];
  verifiedIdentifiers: string[];
  keywordPhrase: string;
  /** Defaults to the troubleshooting rubric so an existing caller is unaffected. */
  categorySlug?: CategorySlug;
}): Promise<QualityResult> {
  const sourceText = sources.map((s) => s.text).join('\n\n');
  const audit = auditIdentifiers(draft, sourceText, verifiedIdentifiers);
  const isTroubleshooting = categorySlug === 'windows';

  const system = [
    isTroubleshooting
      ? 'You are a fact-checker for a Windows troubleshooting site. You did not write this draft.'
      : 'You are a fact-checker for a general-interest news and explainer site. You did not ' +
        'write this draft.',
    'Score it against the sources only. Do not use knowledge that is not in the sources.',
    'Be strict: a plausible-sounding claim with no source behind it is an accuracy failure.',
    isTroubleshooting
      ? ''
      : 'Invented figures, dates, prices, scores, quotes and study results are the failure ' +
        'mode here — check every one against a source.',
  ]
    .filter(Boolean)
    .join(' ');

  const prompt = [
    `TARGET KEYWORD: ${keywordPhrase}`,
    '',
    'SOURCES:',
    sources.map((s, i) => `--- SOURCE ${i + 1}: ${s.title}\n${s.text}`).join('\n\n') ||
      '(none — every specific claim in the draft is therefore unsupported)',
    '',
    'DRAFT:',
    `Title: ${draft.title}`,
    `Quick answer: ${draft.quickAnswer}`,
    // Only meaningful for troubleshooting content; outside it the field is
    // expected to be empty and printing "(none)" invites the model to treat a
    // correctly-empty field as a missing one.
    ...(isTroubleshooting
      ? [`Affected builds: ${draft.affectedBuilds.join(', ') || '(none)'}`]
      : []),
    '',
    draft.body,
    '',
    'FAQ:',
    draft.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'),
  ].join('\n');

  let breakdown: Score | null = null;
  let modelScore = 0;
  let notes = '';

  try {
    const { data } = await generateJson({
      system,
      prompt,
      schema: buildScoreSchema(isTroubleshooting),
      schemaName: 'draft_quality_score',
      maxTokens: 8000,
      effort: 'medium',
    });
    breakdown = data;
    modelScore = data.accuracy + data.structure + data.usefulness + data.safety;
    notes = data.notes;
    if (data.unsupportedClaims.length > 0) {
      notes += `\n\nUnsupported claims flagged:\n${data.unsupportedClaims.map((c) => `- ${c}`).join('\n')}`;
    }
  } catch (error) {
    // A failed review must not look like a passing one. Score 0 and say why.
    notes = `Quality review could not run: ${error instanceof Error ? error.message : String(error)}. Review this draft manually.`;
    modelScore = 0;
  }

  if (audit.blocked) {
    const parts: string[] = [];
    if (audit.hallucinated.kbNumbers.length)
      parts.push(`KB numbers not in sources: ${audit.hallucinated.kbNumbers.join(', ')}`);
    if (audit.hallucinated.buildNumbers.length)
      parts.push(`builds not in sources: ${audit.hallucinated.buildNumbers.join(', ')}`);
    if (audit.hallucinated.errorCodes.length)
      parts.push(`error codes not in sources: ${audit.hallucinated.errorCodes.join(', ')}`);
    notes = `BLOCKED — hallucinated identifiers (${parts.join('; ')}). Remove or verify each one before publishing.\n\n${notes}`;
  }

  return {
    score: modelScore,
    notes: notes.slice(0, 4000),
    blocked: audit.blocked,
    audit,
    breakdown,
  };
}
