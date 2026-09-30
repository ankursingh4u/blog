import { z } from 'zod';

/**
 * Feed parsing and identifier extraction.
 *
 * This module is deliberately dependency-free and pure so it can be unit
 * tested without network or database access. It is also the only place that
 * decides what counts as a real KB number, build number or error code —
 * everything downstream treats its output as the allow-list of identifiers the
 * generator is permitted to mention.
 */

/* ------------------------------------------------------------ identifiers */

// KB articles are "KB" followed by 6–8 digits. Microsoft has never shipped a
// shorter one, and the lower bound stops "KB1" style hallucinations passing.
const KB_RE = /\bKB\s?(\d{6,8})\b/gi;

// Windows build numbers: 5-digit major with an optional revision, e.g.
// 26100.2314 or 22631. The leading boundary check keeps it from matching the
// tail of a longer number.
const BUILD_RE = /\b(1[0-9]{4}|2[0-9]{4})(?:\.(\d{1,5}))?\b/g;

// Windows error codes are 0x followed by 8 hex digits; a few legacy ones are
// shorter, so 4–8 is accepted.
const ERROR_RE = /\b0x[0-9a-f]{4,8}\b/gi;

export function extractKbNumbers(text: string): string[] {
  return unique([...text.matchAll(KB_RE)].map((m) => `KB${m[1]}`));
}

export function extractBuildNumbers(text: string): string[] {
  return unique(
    [...text.matchAll(BUILD_RE)].map((m) => (m[2] ? `${m[1]}.${m[2]}` : m[1])),
  );
}

export function extractErrorCodes(text: string): string[] {
  return unique([...text.matchAll(ERROR_RE)].map((m) => m[0].toLowerCase()));
}

export interface ExtractedIdentifiers {
  kbNumbers: string[];
  buildNumbers: string[];
  errorCodes: string[];
}

export function extractIdentifiers(text: string): ExtractedIdentifiers {
  return {
    kbNumbers: extractKbNumbers(text),
    buildNumbers: extractBuildNumbers(text),
    errorCodes: extractErrorCodes(text),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/* -------------------------------------------------------------- feed items */

export const FeedItem = z.object({
  title: z.string().min(3),
  link: z.string().url(),
  description: z.string().default(''),
  publishedAt: z.date().nullable().default(null),
});
export type FeedItem = z.infer<typeof FeedItem>;

/**
 * Minimal RSS/Atom reader.
 *
 * Microsoft's release feeds are plain RSS 2.0 and Atom; pulling in a full XML
 * parser for two shapes is not worth the dependency. Anything this cannot read
 * is skipped rather than throwing, so one malformed item never fails a run.
 */
export function parseFeed(xml: string): FeedItem[] {
  const entries = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  const items: FeedItem[] = [];

  for (const entry of entries) {
    const title = decode(tag(entry, 'title'));
    const link = extractLink(entry);
    if (!title || !link) continue;

    const description = decode(
      tag(entry, 'description') || tag(entry, 'summary') || tag(entry, 'content'),
    );
    const dateText = tag(entry, 'pubDate') || tag(entry, 'updated') || tag(entry, 'published');
    const parsedDate = dateText ? new Date(dateText) : null;

    const result = FeedItem.safeParse({
      title,
      link,
      description,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    });
    if (result.success) items.push(result.data);
  }

  return items;
}

function tag(source: string, name: string): string {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(source);
  return match ? match[1].trim() : '';
}

function extractLink(entry: string): string {
  // RSS: <link>url</link>. Atom: <link href="url" rel="alternate" />.
  const plain = tag(entry, 'link');
  if (plain && /^https?:\/\//i.test(decode(plain))) return decode(plain);

  const hrefs = [...entry.matchAll(/<link\b([^>]*)\/?>/gi)];
  for (const [, attrs] of hrefs) {
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (rel && rel !== 'alternate') continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (href) return decode(href);
  }
  return '';
}

/**
 * Reads a feed response with the character set it is actually written in.
 *
 * `response.text()` trusts the HTTP `Content-Type` charset and falls back to
 * Latin-1 when there is none. A great many RSS feeds serve UTF-8 while
 * declaring nothing, which is how "GM can't" arrived as "GM canâ€™t" — one
 * apostrophe read a byte at a time.
 *
 * Precedence is: the XML declaration, then the HTTP header, then UTF-8. The
 * document's own declaration is trusted over the header because the header is
 * produced by the web server, which frequently has no idea, while the
 * declaration was written by whatever generated the feed.
 */
export async function readFeedBody(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();

  // The declaration is ASCII-compatible in every encoding worth supporting, so
  // reading the first bytes as UTF-8 is safe regardless of the real charset.
  const preamble = new TextDecoder('utf-8').decode(buffer.slice(0, 200));
  const declared =
    /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(preamble)?.[1] ??
    /charset=([\w-]+)/i.exec(response.headers.get('content-type') ?? '')?.[1] ??
    'utf-8';

  try {
    return new TextDecoder(declared.toLowerCase()).decode(buffer);
  } catch {
    // An encoding label Node does not know. UTF-8 is the right guess in 2026
    // and worst case `repairMojibake` catches what it produces.
    return new TextDecoder('utf-8').decode(buffer);
  }
}

/**
 * Named entities worth resolving by hand, beyond the numeric forms below.
 *
 * Publisher headlines are full of typographic punctuation, and an unresolved
 * `&rsquo;` reaches the reader as literal text in an H1.
 */
const NAMED_ENTITIES: Record<string, string> = {
  lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', middot: '·',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
  uuml: 'ü', ouml: 'ö', auml: 'ä', ntilde: 'ñ',
  pound: '£', euro: '€', deg: '°', amp: '&',
};

/**
 * Repairs UTF-8 that was decoded as Windows-1252.
 *
 * `â€™` is one apostrophe read a byte at a time. It arrives whenever a feed
 * serves UTF-8 without saying so and the decoder falls back to Latin-1 — see
 * `fetchFeedText`, which is where this is now prevented rather than repaired.
 * Kept because the keyword table already holds phrases mangled this way, and a
 * headline is worth repairing on the way out as well as on the way in.
 *
 * Only triggered when a telltale sequence is present, so text that legitimately
 * contains `â` is left alone.
 */
export function repairMojibake(input: string): string {
  // The lead byte of a mangled sequence is the UTF-8 first byte read as
  // Windows-1252: 0xC3 -> "Ã" for two-byte characters (é), 0xE2 -> "â" for the
  // three-byte punctuation range (’ “ —). Both are lowercase in the common
  // case, which an earlier version of this guard missed entirely.
  if (!MOJIBAKE.test(input)) return input;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from([...input].map(cp1252Byte)),
    );
  } catch {
    // Not recoverable as UTF-8 — leave it rather than making it worse.
    return input;
  }
}

/** A UTF-8 lead byte followed by a continuation byte, both read as Windows-1252. */
const MOJIBAKE = /[ÂÃâã][-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;

/**
 * The Windows-1252 byte a character came from.
 *
 * `charCodeAt() & 0xff` is wrong here, and silently so: Windows-1252 maps bytes
 * 0x80-0x9F to code points scattered through General Punctuation, so `€` is
 * U+20AC and masking yields 0xAC rather than 0x80. Every repaired string came
 * out corrupted a different way.
 */
const CP1252_HIGH =
  '€‚ƒ„…†‡ˆ‰Š‹ŒŽ' +
  '‘’“”•–—˜™š›œžŸ';

function cp1252Byte(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0xff) return code;
  const index = CP1252_HIGH.indexOf(char);
  if (index >= 0) return 0x80 + index;
  // Never a Windows-1252 character, so this string is not mojibake after all.
  // Out of byte range forces the decoder to throw and the original is kept.
  return 0x100;
}


/**
 * Strips CDATA wrappers and HTML tags, then resolves entities.
 *
 * Previously resolved seven named entities and nothing numeric, so `&#8216;`
 * reached the database intact and went on to become an article H1 reading
 * "Can &#8216;eSUV&#8217; e-bikes really…". Numeric entities are the common
 * form in publisher RSS, so that was the majority case, not an edge one.
 */
export function decode(input: string): string {
  return repairMojibake(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    // Numeric, decimal and hex. Done before the named pass so a `&amp;#8217;`
    // double-encoding resolves in one direction only.
    .replace(/&#(\d+);/g, (_m, code) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => safeCodePoint(Number.parseInt(code, 16)))
    // `&amp;` resolves last within the named pass because the table is applied
    // in one sweep — otherwise `&amp;lt;` would turn into `<` rather than `&lt;`.
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const value = NAMED_ENTITIES[name.toLowerCase()];
      return value ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Guards against a malformed entity producing an invalid code point. */
function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/* ------------------------------------------------------- keyword synthesis */

/**
 * The live category slugs, matching the `Category.slug` column.
 *
 * These are written straight into `Keyword.categoryId` via a slug lookup, so the
 * union has to stay in step with the seeded categories. It previously held the
 * five pre-pivot Windows slugs (`error-codes`, `how-to`, …), none of which
 * existed in the database any more — every ingested keyword silently landed with
 * a null category as a result.
 *
 * `windows` is the one sub-section (parent: tech) and the only slug that carries
 * the troubleshooting post structure.
 */
export type CategorySlug =
  | 'tech'
  | 'entertainment'
  | 'sports'
  | 'money'
  | 'health'
  | 'gaming'
  | 'travel'
  | 'education'
  | 'windows';

export const CATEGORY_SLUGS: readonly CategorySlug[] = [
  'tech',
  'entertainment',
  'sports',
  'money',
  'health',
  'gaming',
  'travel',
  'education',
  'windows',
] as const;

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export interface KeywordCandidate {
  phrase: string;
  categorySlug: CategorySlug;
  kbNumber: string | null;
  buildNumber: string | null;
  errorCode: string | null;
  sourceUrl: string;
  /** Masthead taken off the headline, used to attribute the link. */
  publisher?: string | null;
}

const PROBLEM_WORDS = /\b(fail|failing|error|issue|problem|known issue|broken|not install|stuck|rollback|blocked)\b/i;
const APP_WORDS = /\b(outlook|office|excel|word|teams|printer|driver|vpn|onedrive|edge|defender|game)\b/i;
const HOWTO_WORDS = /\b(how to|enable|disable|turn on|turn off|configure|set up|settings)\b/i;

/**
 * Turns a **Microsoft feed** item into zero or more keyword candidates.
 *
 * This is the troubleshooting path and it stays deliberately Windows-shaped: it
 * mines KB numbers, build numbers and error codes, and every phrase it produces
 * is a fix-it query. Everything it emits therefore belongs to the `windows`
 * sub-section. General-interest news takes the separate, identifier-free path in
 * `newsItemToCandidate`.
 *
 * Every candidate carries the identifiers that were actually present in the
 * source text. The generator may only mention identifiers that reach it this
 * way — see the quality gate. Titles with no usable identifier and no
 * recognisable intent produce nothing rather than a vague topic.
 */
export function toKeywordCandidates(item: FeedItem): KeywordCandidate[] {
  const haystack = `${item.title} ${item.description}`;
  const { kbNumbers, buildNumbers, errorCodes } = extractIdentifiers(haystack);

  const kb = kbNumbers[0] ?? null;
  const build = buildNumbers[0] ?? null;
  const candidates: KeywordCandidate[] = [];

  const base = { sourceUrl: item.link, kbNumber: kb, buildNumber: build };

  // One candidate per distinct error code — these are the highest-intent pages.
  for (const code of errorCodes.slice(0, 3)) {
    candidates.push({
      ...base,
      errorCode: code,
      categorySlug: 'windows',
      phrase: `How to fix ${code} in Windows 11`,
    });
  }

  if (kb) {
    const isProblem = PROBLEM_WORDS.test(haystack);
    candidates.push({
      ...base,
      errorCode: null,
      categorySlug: 'windows',
      phrase: isProblem
        ? `${kb} not installing in Windows 11`
        : `What's new in ${kb} for Windows 11`,
    });
  }

  if (APP_WORDS.test(haystack) && PROBLEM_WORDS.test(haystack)) {
    const app = APP_WORDS.exec(haystack)?.[0];
    if (app) {
      candidates.push({
        ...base,
        errorCode: null,
        categorySlug: 'windows',
        phrase: `${titleCase(app)} not working after Windows update`,
      });
    }
  }

  if (candidates.length === 0 && HOWTO_WORDS.test(item.title)) {
    candidates.push({
      ...base,
      errorCode: null,
      categorySlug: 'windows',
      phrase: normalisePhrase(item.title),
    });
  }

  return candidates.filter((c) => c.phrase.length >= 12 && c.phrase.length <= 110);
}

/**
 * Turns a general-interest Google News item into a keyword candidate.
 *
 * Deliberately much thinner than `toKeywordCandidates`. A news headline is a
 * *topic*, not a diagnosis: there is no KB number to mine and no error code to
 * key a fix-it page on, so all three identifier fields stay null. Inferring one
 * from a headline is exactly the fabrication the editorial rules forbid — the
 * only identifiers ever attached are ones that appear verbatim in the text, and
 * general news does not carry them.
 *
 * The vertical is supplied by the caller rather than sniffed from the text,
 * because the caller knows which Google News section the item came out of, which
 * is far better evidence than a keyword match on the headline.
 *
 * Returns null for anything that would make a poor page: bare live-blog markers,
 * headlines too short to carry an intent, or ones too long to be a title.
 */
export function newsItemToCandidate(
  item: FeedItem,
  categorySlug: CategorySlug,
): KeywordCandidate | null {
  const phrase = normalisePhrase(stripNewsPublisher(item.title));

  if (phrase.length < 25 || phrase.length > 110) return null;
  // Live blogs and photo galleries update continuously; a static article about
  // one is out of date the moment it publishes.
  if (/\b(live updates?|live blog|live score|in pictures|photos?|watch:|video:)\b/i.test(phrase)) {
    return null;
  }
  // A headline that is one clause with no verb is usually a section label.
  if (!/\s/.test(phrase)) return null;

  return {
    phrase,
    categorySlug,
    kbNumber: null,
    buildNumber: null,
    errorCode: null,
    sourceUrl: item.link,
    publisher: newsPublisher(item.title),
  };
}

/**
 * Google News appends the publisher to every headline: "Headline - Publisher".
 *
 * The separator is an ASCII hyphen surrounded by spaces, which also appears
 * inside legitimate headlines, so the tail is only removed when it looks like a
 * publisher name: short, and without the sentence punctuation a clause carries.
 */
export function stripNewsPublisher(title: string): string {
  return decode(title)
    .replace(/\s+[-–—]\s+([^-–—,;:]{2,40})$/, (match, publisher: string) =>
      /[.!?]$/.test(publisher.trim()) ? match : '',
    )
    .trim();
}

/**
 * The publisher name the above strips off, or null when the headline carries
 * none.
 *
 * Worth keeping rather than discarding. Over half of Google News links point at
 * `news.google.com` rather than the publisher, so the destination host cannot be
 * used to say where a story came from — and showing a reader "news.google.com"
 * as the source of an article is worse than showing nothing. The name in the
 * headline is the only reliable attribution available at ingest time.
 */
export function newsPublisher(title: string): string | null {
  const match = decode(title).match(/\s+[-–—]\s+([^-–—,;:]{2,40})$/);
  if (!match) return null;
  const publisher = match[1].trim();
  // Same guard as the stripper: a trailing clause that ends in sentence
  // punctuation is part of the headline, not a masthead.
  if (/[.!?]$/.test(publisher)) return null;
  return publisher;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalisePhrase(title: string) {
  return decode(title).replace(/\s*[-–|]\s*(Microsoft|Windows Blog).*$/i, '').trim();
}
