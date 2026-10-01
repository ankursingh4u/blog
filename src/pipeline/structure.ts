/**
 * Deterministic editorial-structure check.
 *
 * The generation prompt asks for a specific shape, introduction, scannable H2
 * sections, at least one list, a conclusion with a call to action, and a real
 * word count. Asking the model to grade its own compliance is unreliable, and
 * these properties are all mechanically checkable, so they are checked here
 * instead and the result feeds the publish decision.
 *
 * Word counts exclude fenced code blocks: a troubleshooting guide full of
 * commands would otherwise pass the length floor without containing much prose.
 */

/**
 * The publishable band, raised from 800-1200 on 2026-09-29.
 *
 * A floor this high only works alongside `checkPadding`. Length and the
 * standing instruction to "cut every word that does no work" pull against each
 * other, and given only the floor the cheapest way to satisfy it is to say the
 * same thing three times. The padding check is what makes the floor mean
 * "covered more ground" rather than "wrote more words", so the two are a pair:
 * raising this without it would buy nothing but filler.
 */
export const MIN_WORDS = 1500;
export const STANDARD_MAX_WORDS = 2000;
export const MAX_SENTENCES_PER_PARAGRAPH = 5;

export interface StructureIssue {
  /** Machine-readable rule name, for logging and tests. */
  rule:
    | 'too-short'
    | 'missing-intro'
    | 'missing-conclusion'
    | 'no-subheadings'
    | 'no-lists'
    | 'long-paragraphs'
    | 'over-standard-length'
    | 'has-h1';
  detail: string;
  /** Blocking issues prevent auto-publish; the rest are advisory notes. */
  blocking: boolean;
}

export interface StructureReport {
  wordCount: number;
  issues: StructureIssue[];
  /** True when nothing blocking was found. */
  ok: boolean;
}

/** Removes fenced code so it does not count towards prose length or paragraphs. */
function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '\n');
}

export function countWords(markdown: string): number {
  return stripCode(markdown)
    .replace(/[#>*_`|-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Paragraphs: blank-line separated blocks that are not headings, quotes or list items. */
function paragraphs(markdown: string): string[] {
  return stripCode(markdown)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(
      (block) =>
        block.length > 0 &&
        !block.startsWith('#') &&
        !block.startsWith('>') &&
        !/^([-*+]|\d+\.)\s/.test(block),
    );
}

function sentenceCount(paragraph: string): number {
  // Good enough for prose: terminators followed by whitespace or end of block.
  return (paragraph.match(/[.!?](\s|$)/g) ?? []).length;
}

const CONCLUSION_HEADING =
  /\b(conclusion|summary|in summary|the bottom line|bottom line|what to do next|next steps|takeaways?|where to go next|final thoughts?)\b/i;

export function checkStructure(body: string): StructureReport {
  const issues: StructureIssue[] = [];
  const wordCount = countWords(body);

  if (wordCount < MIN_WORDS) {
    issues.push({
      rule: 'too-short',
      detail: `${wordCount} words; the floor for a publishable article is ${MIN_WORDS}.`,
      blocking: true,
    });
  }

  if (/^#\s/m.test(body)) {
    issues.push({
      rule: 'has-h1',
      detail: 'Body contains an H1. The title is rendered separately.',
      blocking: true,
    });
  }

  const headings = [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((m) => m[2].trim());
  if (headings.length < 2) {
    issues.push({
      rule: 'no-subheadings',
      detail: `${headings.length} subheading(s); an article needs H2 sections to be scannable.`,
      blocking: true,
    });
  }

  if (!headings.some((h) => CONCLUSION_HEADING.test(h))) {
    issues.push({
      rule: 'missing-conclusion',
      detail: 'No closing section. The body must end with a conclusion that tells the reader what to do next.',
      blocking: true,
    });
  }

  // The introduction is whatever prose precedes the first subheading.
  const firstHeadingAt = body.search(/^#{2,3}\s+/m);
  const intro = firstHeadingAt === -1 ? body : body.slice(0, firstHeadingAt);
  if (countWords(intro) < 40) {
    issues.push({
      rule: 'missing-intro',
      detail: 'The body must open with an introduction before the first subheading.',
      blocking: true,
    });
  }

  if (!/^\s*([-*+]|\d+\.)\s+/m.test(body)) {
    issues.push({
      rule: 'no-lists',
      detail: 'No bullet or numbered list. Lists are what make a page skimmable.',
      blocking: false,
    });
  }

  // The band is 1500-2000; a deep dive on a competitive topic may run further.
  // There is no way to tell mechanically which was intended, so overshooting is
  // a note for the editor rather than a failure, the floor is the rule worth
  // blocking on, and `checkPadding` is what judges whether the extra words are
  // substance or repetition.
  if (wordCount > STANDARD_MAX_WORDS) {
    issues.push({
      rule: 'over-standard-length',
      detail:
        `${wordCount} words, over the ${STANDARD_MAX_WORDS}-word standard. Fine for a deep ` +
        'dive; padding otherwise.',
      blocking: false,
    });
  }

  const overlong = paragraphs(body).filter(
    (p) => sentenceCount(p) > MAX_SENTENCES_PER_PARAGRAPH,
  ).length;
  if (overlong > 0) {
    issues.push({
      rule: 'long-paragraphs',
      detail: `${overlong} paragraph(s) run over ${MAX_SENTENCES_PER_PARAGRAPH} sentences.`,
      blocking: false,
    });
  }

  return { wordCount, issues, ok: !issues.some((issue) => issue.blocking) };
}

/** One-line summary for quality notes and pipeline logs. */
export function describeStructure(report: StructureReport): string {
  if (report.issues.length === 0) return `Structure OK (${report.wordCount} words).`;
  return `Structure (${report.wordCount} words): ${report.issues
    .map((i) => `${i.blocking ? 'BLOCKING' : 'note'} ${i.rule}, ${i.detail}`)
    .join(' ')}`;
}
