/**
 * Prose style checker.
 *
 * Encodes two external standards:
 *
 * - Wikipedia:Signs of AI writing — the tells that mark text as machine-written:
 *   a characteristic vocabulary, copula avoidance, negative parallelisms,
 *   significance-inflation, and em-dash overuse.
 * - Wikipedia:Writing better articles — concision, no puffery or weasel words,
 *   no editorialising, no self-reference.
 *
 * Two rules from those pages are deliberately NOT enforced: the bans on second
 * person and on contractions. Both are correct for an encyclopedia and wrong for
 * a how-to blog, where addressing the reader directly is the point.
 *
 * Everything here is advisory. It reports density so a human (or the pipeline
 * log) can see whether prose is drifting, rather than blocking a publish on a
 * word that happens to be legitimate in context.
 */

export interface StyleHit {
  rule: string;
  /** What matched, lowercased and deduplicated. */
  matches: string[];
  count: number;
  note: string;
}

export interface StyleReport {
  wordCount: number;
  hits: StyleHit[];
  /** Flagged occurrences per 1,000 words. */
  density: number;
  emDashesPer1000: number;
}

/** Strips fenced code and inline code so commands are not scored as prose. */
function prose(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Vocabulary that clusters in machine-written text. Words are matched on word
 * boundaries; several are perfectly good in isolation, which is why this reports
 * density rather than banning them.
 */
const AI_VOCAB = [
  'additionally', 'align with', 'aligns with', 'bolstered', 'crucial', 'delve',
  'emphasizing', 'emphasising', 'enduring', 'enhance', 'enhancing', 'fostering',
  'foster', 'garner', 'intricate', 'interplay', 'landscape', 'meticulous',
  'meticulously', 'pivotal', 'showcase', 'showcases', 'tapestry', 'testament',
  'underscore', 'underscores', 'underscoring', 'vibrant', 'seamless',
  'seamlessly', 'robust', 'leverage', 'leveraging', 'myriad', 'realm',
  'navigate the', 'ever-evolving', 'ever-changing', 'in today’s world',
  "in today's world", 'it is worth noting', 'it’s worth noting',
  "it's worth noting", 'furthermore', 'moreover',
];

/** Puffery and peacock terms — Writing better articles. */
const PUFFERY = [
  'boasts a', 'boasts', 'groundbreaking', 'renowned', 'diverse array',
  'nestled', 'in the heart of', 'game-changing', 'cutting-edge',
  'state-of-the-art', 'unparalleled', 'revolutionary', 'world-class',
  'rich history', 'profound',
];

/** Significance inflation — the "stands as a testament" family. */
const SIGNIFICANCE = [
  'stands as', 'serves as a testament', 'is a testament', 'crucial role',
  'pivotal role', 'vital role', 'key turning point', 'indelible mark',
  'underscores the importance', 'highlights the importance',
  'reflects a broader', 'reflects broader',
];

/** Copula avoidance: "serves as" where "is" would do. */
const COPULA_AVOIDANCE = [
  'serves as', 'serve as', 'functions as', 'represents a', 'marks a',
];

/** Vague attribution and weasel words. */
const WEASEL = [
  'some argue', 'many believe', 'it is widely', 'experts say', 'critics say',
  'some say', 'is considered to be', 'is regarded as', 'arguably',
];

/** Self-reference — Writing better articles explicitly calls these out. */
const SELF_REFERENCE = [
  'note that', 'as mentioned above', 'as noted above', 'as discussed earlier',
  'in this article', 'this article will', 'we will explore', 'let us',
];

/**
 * References to the research material itself — the strongest tell of the lot,
 * and the one the vocabulary lists missed completely.
 *
 * 24 of the first 34 articles contained one. They read like an audit of their own
 * inputs rather than a piece of writing: "the supplied sources", "this source
 * pack", "Status: not confirmed in the supplied sources". A human writer has
 * sources too and never mentions them this way, because the reader cannot see
 * them and does not know they exist.
 *
 * The cause was an instruction permitting the model to "say plainly that it is
 * not confirmed" when the research did not support the headline. It took that as
 * licence to make the verification status the subject of the article. The prompt
 * no longer allows it; this catches any that slip through.
 */
const RESEARCH_META = [
  'supplied source', 'supplied sources', 'supplied record', 'supplied material',
  'source pack', 'sources provided', 'provided sources', 'the provided material',
  'material provided', 'not confirmed in the', 'in the supplied',
  'based on this source', 'from the supplied',
];

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findAll(text: string, terms: string[]): string[] {
  const found: string[] = [];
  for (const term of terms) {
    // \b does not work before a non-word char, so only anchor where meaningful.
    const pattern = new RegExp(`(^|[^a-z])${escape(term)}([^a-z]|$)`, 'gi');
    const count = (text.match(pattern) ?? []).length;
    for (let i = 0; i < count; i += 1) found.push(term.toLowerCase());
  }
  return found;
}

function hit(rule: string, matches: string[], note: string): StyleHit | null {
  if (matches.length === 0) return null;
  return {
    rule,
    matches: [...new Set(matches)].sort(),
    count: matches.length,
    note,
  };
}

export function checkStyle(markdown: string): StyleReport {
  const text = prose(markdown);
  const wordCount = words(text);
  const hits: StyleHit[] = [];

  const push = (h: StyleHit | null) => {
    if (h) hits.push(h);
  };

  push(hit('ai-vocabulary', findAll(text, AI_VOCAB), 'Vocabulary that clusters in machine-written prose.'));
  push(hit('puffery', findAll(text, PUFFERY), 'Peacock terms. State what a thing does instead.'));
  push(hit('significance-inflation', findAll(text, SIGNIFICANCE), 'Claims of importance in place of specifics.'));
  push(hit('copula-avoidance', findAll(text, COPULA_AVOIDANCE), 'Prefer "is" to "serves as".'));
  push(hit('weasel-words', findAll(text, WEASEL), 'Vague attribution. Name the source or drop the claim.'));
  push(hit('self-reference', findAll(text, SELF_REFERENCE), 'Do not refer to the article from inside it.'));
  push(
    hit(
      'research-meta',
      findAll(text, RESEARCH_META),
      'Do not mention the research material. The reader cannot see it and does not know it exists.',
    ),
  );

  // "Not just X, but Y" / "It is not X, it is Y" — negative parallelism.
  const negParallel =
    text.match(/\bnot (just|only|merely|simply)\b[^.!?]{0,80}?\bbut\b/gi) ?? [];
  push(
    hit(
      'negative-parallelism',
      negParallel.map((m) => m.slice(0, 40).toLowerCase()),
      'The "not just X, but Y" construction. Say the positive claim directly.',
    ),
  );

  // Em-dash density. Occasional use is fine; clusters are a tell.
  const emDashes = (text.match(/—/g) ?? []).length;
  const emDashesPer1000 = wordCount ? (emDashes / wordCount) * 1000 : 0;
  if (emDashesPer1000 > 6) {
    hits.push({
      rule: 'em-dash-overuse',
      matches: ['—'],
      count: emDashes,
      note: `${emDashesPer1000.toFixed(1)} per 1,000 words. Prefer commas, colons or a full stop.`,
    });
  }

  const flagged = hits
    .filter((h) => h.rule !== 'em-dash-overuse')
    .reduce((sum, h) => sum + h.count, 0);

  return {
    wordCount,
    hits,
    density: wordCount ? (flagged / wordCount) * 1000 : 0,
    emDashesPer1000,
  };
}

export function describeStyle(report: StyleReport): string {
  if (report.hits.length === 0) return 'Style clean.';
  return report.hits
    .map((h) => `${h.rule} x${h.count} (${h.matches.slice(0, 6).join(', ')})`)
    .join('; ');
}
