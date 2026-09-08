/**
 * Near-duplicate detection for headlines and article titles.
 *
 * One story reaches us under many headlines. Google News carries every
 * publisher's wording of the same event, and the India and US editions often
 * carry both, so "Transfer rumors: Arsenal want Rice" and "Arsenal in Rice
 * talks — transfer rumors" arrive as two distinct phrases. Ingest dedupes on
 * the exact phrase, which catches none of that: both became keywords, both were
 * written up, and the site ended up with the same story three times.
 *
 * Comparison is on the set of distinctive words rather than the string, because
 * the difference between two versions of a headline is almost always word order
 * and framing rather than substance.
 */

/**
 * Words too common to distinguish one story from another. Short words are
 * dropped by length, so this only needs the longer ones that carry no meaning
 * in a headline.
 */
const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'has', 'will', 'what', 'when', 'where',
  'which', 'after', 'before', 'about', 'into', 'over', 'more', 'most', 'than',
  'they', 'their', 'them', 'been', 'being', 'also', 'some', 'such', 'only',
  'just', 'like', 'make', 'made', 'says', 'said', 'here', 'news', 'live',
  'update', 'updates', 'latest', 'today', 'check', 'know', 'your', 'you',
]);

/** The distinctive words of a title, lowercased and deduped. */
export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word)),
  );
}

export interface DuplicateOptions {
  /**
   * Share of the shorter title's words that must also appear in the longer one.
   * Measured against the shorter side so a wire headline still matches the
   * padded SEO version of itself.
   */
  ratio?: number;
  /**
   * Absolute number of words that must overlap, regardless of ratio. Without
   * this, two short headlines sharing a single word — "Arsenal beat Chelsea"
   * and "Arsenal beat Spurs" — clear a percentage test and two genuinely
   * different results get collapsed into one.
   */
  minShared?: number;
}

export function sharedTokenCount(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared;
}

export function isNearDuplicate(
  a: Set<string>,
  b: Set<string>,
  { ratio = 0.7, minShared = 3 }: DuplicateOptions = {},
): boolean {
  const smaller = Math.min(a.size, b.size);
  if (smaller === 0) return false;

  const shared = sharedTokenCount(a, b);
  // A title with fewer distinctive words than the floor can still be a
  // duplicate — it just has to match nearly all of them.
  const required = Math.min(minShared, smaller);
  return shared >= required && shared / smaller >= ratio;
}

/** Convenience for callers holding raw strings rather than token sets. */
export function titlesAreNearDuplicates(
  a: string,
  b: string,
  options?: DuplicateOptions,
): boolean {
  return isNearDuplicate(titleTokens(a), titleTokens(b), options);
}
