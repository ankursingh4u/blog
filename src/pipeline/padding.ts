/**
 * Deterministic padding check.
 *
 * The word floor and the prose rules pull in opposite directions. `MIN_WORDS`
 * says 1500; `PROSE_RULES` says cut every word that does no work. Faced with a
 * thin story, the cheapest way to satisfy the first is to restate the same
 * point under three headings — which is exactly the shape Google's helpfulness
 * signals are built to catch, and exactly what a length floor produces if
 * nothing is watching.
 *
 * So this measures repetition rather than length. It is deterministic for the
 * same reason `structure.ts` is: a model asked whether its own article padded
 * will say no.
 *
 * What it does not do is judge whether a sentence is *worth* saying. A draft can
 * be free of repetition and still be dull. That is the editor's call; this
 * catches the specific failure the floor creates.
 */

/** Words too common to tell two sentences apart. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'its', 'this', 'that', 'these', 'those', 'there', 'here', 'they',
  'their', 'them', 'you', 'your', 'we', 'our', 'he', 'she', 'his', 'her',
  'not', 'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'do', 'does', 'did', 'have', 'has', 'had', 'about', 'into', 'over', 'after',
  'before', 'more', 'most', 'also', 'than', 'then', 'so', 'if', 'all', 'any',
  'when', 'which', 'what', 'who', 'how', 'why', 'while', 'because',
]);

/** Below this many distinctive words, a sentence is too short to judge. */
const MIN_TOKENS = 6;
/** Share of the shorter sentence's distinctive words that must overlap. */
const SENTENCE_OVERLAP = 0.8;
/** Share of the shorter section's distinctive words that must overlap. */
const SECTION_OVERLAP = 0.65;
/** Repeated sentences above this share of the body is padding, not coincidence. */
const MAX_REPEAT_SHARE = 0.12;

export interface PaddingIssue {
  rule: 'repeated-sentences' | 'duplicate-sections';
  detail: string;
  blocking: boolean;
}

export interface PaddingReport {
  sentenceCount: number;
  /** Sentences having at least one near-identical partner. Bounded by sentenceCount. */
  repeatedSentences: number;
  repeatedPairs: number;
  /** Illustrative pairs, for the quality notes. Not exhaustive. */
  examples: Array<{ a: string; b: string }>;
  issues: PaddingIssue[];
  ok: boolean;
}

function stripCode(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '\n');
}

export function distinctiveTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  const smaller = Math.min(a.size, b.size);
  if (smaller === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / smaller;
}

/**
 * Prose sentences, with headings, list markers and code removed.
 *
 * List items are dropped deliberately. A well-made comparison list repeats its
 * own frame on every row — "Battery life: …", "Battery life: …" — and counting
 * those as restatements would flag the most scannable part of a good article.
 */
export function proseSentences(markdown: string): string[] {
  return stripCode(markdown)
    .split('\n')
    .filter((line) => !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>)/.test(line))
    .join(' ')
    .replace(/[*_`|]/g, '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** H2/H3 sections as [heading, body] pairs. Text before the first heading is ignored. */
export function sections(markdown: string): Array<{ heading: string; text: string }> {
  const out: Array<{ heading: string; text: string }> = [];
  const parts = stripCode(markdown).split(/^(#{2,3})\s+(.+)$/gm);
  // split() with two capture groups yields [pre, hashes, heading, body, ...].
  for (let i = 1; i < parts.length; i += 3) {
    out.push({ heading: (parts[i + 1] ?? '').trim(), text: (parts[i + 2] ?? '').trim() });
  }
  return out;
}

export function checkPadding(body: string): PaddingReport {
  const issues: PaddingIssue[] = [];
  const sentences = proseSentences(body);

  const tokenised = sentences
    .map((text) => ({ text, tokens: distinctiveTokens(text) }))
    .filter((s) => s.tokens.size >= MIN_TOKENS);

  const examples: Array<{ a: string; b: string }> = [];
  /**
   * Sentences involved in a repeat, not the number of pairs.
   *
   * Pairs grow with the square of the repetition: six copies of one claim make
   * fifteen pairs, which against a sentence count reads as 300% and makes the
   * threshold meaningless. What is actually wanted is "how much of the article
   * is restatement", so the unit is the sentence.
   */
  const involved = new Set<number>();
  let repeatedPairs = 0;

  for (let i = 0; i < tokenised.length; i += 1) {
    for (let j = i + 1; j < tokenised.length; j += 1) {
      if (overlapRatio(tokenised[i].tokens, tokenised[j].tokens) >= SENTENCE_OVERLAP) {
        repeatedPairs += 1;
        involved.add(i);
        involved.add(j);
        if (examples.length < 3) {
          examples.push({ a: tokenised[i].text, b: tokenised[j].text });
        }
      }
    }
  }

  // A share rather than a count: two echoed sentences in an 1,800-word article
  // is a stylistic tic, the same two in 300 words is the article eating itself.
  const share = tokenised.length > 0 ? involved.size / tokenised.length : 0;
  if (share > MAX_REPEAT_SHARE) {
    issues.push({
      rule: 'repeated-sentences',
      detail:
        `${involved.size} of ${tokenised.length} sentences restate another ` +
        `(${Math.round(share * 100)}%). The article is repeating itself to reach length.`,
      blocking: true,
    });
  }

  // Two H2s covering the same ground is the other way a length floor gets met:
  // the draft invents a second heading and says it again underneath.
  const withText = sections(body)
    .map((s) => ({ ...s, tokens: distinctiveTokens(s.text) }))
    .filter((s) => s.tokens.size >= 25);

  const duplicateSections: string[] = [];
  for (let i = 0; i < withText.length; i += 1) {
    for (let j = i + 1; j < withText.length; j += 1) {
      if (overlapRatio(withText[i].tokens, withText[j].tokens) >= SECTION_OVERLAP) {
        duplicateSections.push(`"${withText[i].heading}" / "${withText[j].heading}"`);
      }
    }
  }

  if (duplicateSections.length > 0) {
    issues.push({
      rule: 'duplicate-sections',
      detail: `Sections covering the same ground: ${duplicateSections.slice(0, 3).join('; ')}.`,
      blocking: true,
    });
  }

  return {
    sentenceCount: tokenised.length,
    repeatedSentences: involved.size,
    repeatedPairs,
    examples,
    issues,
    ok: !issues.some((issue) => issue.blocking),
  };
}

/** One-line summary for quality notes and pipeline logs. */
export function describePadding(report: PaddingReport): string {
  if (report.issues.length === 0) {
    return `Padding OK (${report.sentenceCount} sentences, ${report.repeatedSentences} restating another).`;
  }
  const detail = report.issues.map((i) => `${i.blocking ? 'BLOCKING' : 'note'} ${i.rule} — ${i.detail}`);
  const shown = report.examples.map((e) => `  · "${e.a}" ≈ "${e.b}"`);
  return [`Padding: ${detail.join(' ')}`, ...shown].join('\n');
}
