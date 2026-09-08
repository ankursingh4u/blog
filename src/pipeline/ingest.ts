import { prisma } from '@/lib/db';
import {
  newsItemToCandidate,
  normalisePhrase,
  parseFeed,
  toKeywordCandidates,
  type FeedItem,
  type KeywordCandidate,
  type CategorySlug,
} from '@/pipeline/parser';
import {
  classifyVertical,
  fetchAllSuggestions,
  fetchGoogleTrends,
  fetchTrendingByVertical,
} from '@/pipeline/discovery';
import { isNearDuplicate, titleTokens } from '@/lib/similarity';
import { asBool, getSettings } from '@/lib/settings';
import { log } from '@/pipeline/log';

/**
 * Step 1 — ingest.
 *
 * Four discovery channels, each independently switchable from /admin/settings:
 *
 *   1. Microsoft release feeds — authoritative, carries real identifiers.
 *      Feeds the `/tech/windows` sub-section only.
 *   2. Google News RSS — the main channel. Section feeds, search feeds and top
 *      stories, across all eight verticals and both editions.
 *   3. Google autocomplete — what people are actually typing.
 *   4. Google Trends daily RSS — today's spikes.
 *
 * Channel 1 is the only one that can be trusted for identifiers, and it is the
 * only one that produces troubleshooting-shaped keywords. Channels 2–4 produce
 * general-interest topics with no identifiers attached at all, which is the
 * point: a news headline is a subject to explain, not a fault to diagnose, and
 * inferring a KB number or an error code from one would be fabrication.
 *
 * The quality gate still checks every identifier against the research sources
 * before anything can publish.
 *
 * Deduping happens twice. Exact `phrase` is unique, so a re-run is a no-op; on
 * top of that, a candidate that is a retelling of a story already queued or used
 * is dropped (`src/lib/similarity.ts`) — one event reaches us under a different
 * headline from every publisher and both editions, and the exact-phrase check
 * sees those as unrelated.
 *
 * Channel order is also precedence order — the first writer of a phrase wins, so
 * a Microsoft-feed candidate keeps its verified identifiers if a news item later
 * produces the same phrase.
 */

export const FEEDS = [
  {
    name: 'Windows release health',
    url: 'https://learn.microsoft.com/api/search/rss?search=Windows+release+health&locale=en-us&$filter=scopes%2Fany(t%3A%20t%20eq%20%27Windows%27)',
  },
  {
    name: 'Windows Insider blog',
    url: 'https://blogs.windows.com/windows-insider/feed/',
  },
  // Replaced the Windows IT Pro TechCommunity board feed, which now 404s —
  // Microsoft reorganised the TechCommunity RSS paths and the board id no longer
  // resolves. The `/t5/s/` variant answers 200 but returns an empty channel, so
  // there is no drop-in replacement; this is the nearest live equivalent.
  {
    name: 'Windows Experience blog',
    url: 'https://blogs.windows.com/windowsexperience/feed/',
  },
] as const;

const FETCH_TIMEOUT_MS = 15_000;

export interface IngestResult {
  feedsRead: number;
  feedsFailed: string[];
  itemsSeen: number;
  candidates: number;
  inserted: number;
  /** Per-channel contribution, for the admin run log. */
  bySource: { feeds: number; news: number; suggest: number; trends: number };
}

export async function ingest(): Promise<IngestResult> {
  const result: IngestResult = {
    feedsRead: 0,
    feedsFailed: [],
    itemsSeen: 0,
    candidates: 0,
    inserted: 0,
    bySource: { feeds: 0, news: 0, suggest: 0, trends: 0 },
  };

  const settings = await getSettings();
  const useNews = asBool(settings.DISCOVERY_NEWS);
  const useSuggest = asBool(settings.DISCOVERY_SUGGEST);
  const useTrends = asBool(settings.DISCOVERY_TRENDS);

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const allCandidates: Array<KeywordCandidate & { channel: keyof IngestResult['bySource'] }> = [];

  /* ------------------------------------------- 1. Microsoft release feeds */
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      const items = parseFeed(xml);
      result.feedsRead += 1;
      result.itemsSeen += items.length;
      for (const item of items) {
        for (const candidate of toKeywordCandidates(item)) {
          allCandidates.push({ ...candidate, channel: 'feeds' });
        }
      }
      log.info(`ingest: ${feed.name} → ${items.length} items`);
    } catch (error) {
      // One unreachable feed must not abort the run — the others still have value.
      result.feedsFailed.push(feed.name);
      log.warn(`ingest: ${feed.name} failed — ${describe(error)}`);
    }
  }

  /* --------------------------------------------------- 2. Google News RSS */
  if (useNews) {
    const trending = await fetchTrendingByVertical();
    result.itemsSeen += trending.length;

    const perVertical = new Map<CategorySlug, number>();
    for (const { item, slug } of trending) {
      const candidate = newsItemToCandidate(item, slug);
      if (!candidate) continue;
      allCandidates.push({ ...candidate, channel: 'news' });
      perVertical.set(slug, (perVertical.get(slug) ?? 0) + 1);
    }

    log.info(
      `ingest: Google News → ${trending.length} items → ` +
        ([...perVertical.entries()].map(([s, n]) => `${s} ${n}`).join(', ') || 'no candidates'),
    );
  } else {
    log.info('ingest: Google News disabled in settings');
  }

  /* ------------------------------------------------- 3. Google autocomplete */
  if (useSuggest) {
    const phrases = await fetchAllSuggestions();
    for (const { phrase, slug } of phrases) {
      allCandidates.push({
        ...phraseToCandidate(phrase, 'google-suggest', slug),
        channel: 'suggest',
      });
    }
    log.info(`ingest: Google Suggest → ${phrases.length} phrase(s)`);
  } else {
    log.info('ingest: Google Suggest disabled in settings');
  }

  /* ------------------------------------------------------ 4. Google Trends */
  if (useTrends) {
    // India first, matching the news editions; US second for reach.
    const terms = (await Promise.all([fetchGoogleTrends('IN'), fetchGoogleTrends('US')])).flat();
    for (const { phrase, slug } of terms) {
      allCandidates.push({
        ...phraseToCandidate(phrase, 'google-trends', slug),
        channel: 'trends',
      });
    }
    log.info(
      terms.length > 0
        ? `ingest: Google Trends → ${terms.length} classifiable term(s)`
        : 'ingest: Google Trends → nothing classifiable today',
    );
  } else {
    log.info('ingest: Google Trends disabled in settings');
  }

  /* ------------------------------------------------------------ persistence */
  const byPhrase = new Map<string, (typeof allCandidates)[number]>();
  for (const candidate of allCandidates) {
    // First writer wins, and the Microsoft feeds run first — so if the same
    // phrase is found by both, the version keeping the verified identifiers is
    // the one that survives.
    if (!byPhrase.has(candidate.phrase)) byPhrase.set(candidate.phrase, candidate);
  }
  result.candidates = byPhrase.size;
  const unresolvedSlugs = new Set<string>();

  // Near-duplicate guard. Matching on the exact phrase catches only a literal
  // repeat, and one story never arrives twice in the same words: every
  // publisher writes its own headline and both editions carry several of them.
  // Left to the phrase check alone, "Transfer rumors: Arsenal want Rice" and
  // "Arsenal in Rice talks — transfer rumors" both became keywords and both got
  // written up, which is how the site ended up with the same story three times.
  //
  // Compared against everything already queued or used, not just this batch, so
  // tomorrow's run does not re-ingest a story yesterday already covered.
  const priorPhrases = await prisma.keyword.findMany({
    where: { status: { in: ['QUEUED', 'USED'] } },
    select: { phrase: true },
  });
  const seenTokens = priorPhrases.map((k) => titleTokens(k.phrase));
  let nearDuplicates = 0;

  for (const candidate of byPhrase.values()) {
    const existing = await prisma.keyword.findUnique({
      where: { phrase: candidate.phrase },
      select: { id: true },
    });
    if (existing) continue;

    const tokens = titleTokens(candidate.phrase);
    if (seenTokens.some((prior) => isNearDuplicate(tokens, prior))) {
      nearDuplicates += 1;
      continue;
    }
    // Added before the row is written so the rest of this batch is compared
    // against it too, not just against what was already in the table.
    seenTokens.push(tokens);

    // A keyword with no category can never be selected for generation, so an
    // unresolved slug silently drops the topic. That is exactly how the
    // pre-pivot slugs went unnoticed — say so rather than storing null quietly.
    const categoryId = categoryIdBySlug.get(candidate.categorySlug) ?? null;
    if (categoryId === null) {
      unresolvedSlugs.add(candidate.categorySlug);
    }

    await prisma.keyword.create({
      data: {
        phrase: candidate.phrase,
        categoryId,
        source: 'FEED',
        status: 'QUEUED',
        kbNumber: candidate.kbNumber,
        buildNumber: candidate.buildNumber,
        errorCode: candidate.errorCode,
        sourceUrl: candidate.sourceUrl,
      },
    });
    result.inserted += 1;
    result.bySource[candidate.channel] += 1;
  }

  if (unresolvedSlugs.size > 0) {
    log.warn(
      `ingest: no Category row for slug(s) ${[...unresolvedSlugs].join(', ')} — those keywords ` +
        'were stored without a category and will never be selected. Seed the categories.',
    );
  }

  if (nearDuplicates > 0) {
    log.info(`ingest: ${nearDuplicates} candidate(s) dropped as retellings of a story already queued`);
  }

  const { feeds, news, suggest, trends } = result.bySource;
  log.info(
    `ingest: ${result.itemsSeen} items → ${result.candidates} candidates → ${result.inserted} new ` +
      `(feeds ${feeds}, news ${news}, suggest ${suggest}, trends ${trends})`,
  );
  return result;
}

/**
 * Turns a bare search phrase into a keyword candidate.
 *
 * Unlike a feed item there is no article body to mine, so the only identifiers
 * attached are ones present in the phrase itself — someone searching
 * "0x800f0922 fix" has supplied a real error code; a phrase with no identifier
 * gets none rather than an inferred one.
 */
export function phraseToCandidate(
  phrase: string,
  origin: string,
  /**
   * The vertical the discovery channel already determined. Passed in because the
   * channel knows which seed or trends region produced the phrase, which beats
   * re-deriving it from the words alone; omitted, the phrase is classified here.
   */
  slug?: CategorySlug,
): KeywordCandidate {
  const cleaned = normalisePhrase(phrase);
  const errorCode = /0x[0-9a-f]{4,8}/i.exec(cleaned)?.[0]?.toLowerCase() ?? null;
  const kbMatch = /\bKB\s?(\d{6,8})\b/i.exec(cleaned);
  const kbNumber = kbMatch ? `KB${kbMatch[1]}` : null;

  return {
    phrase: capitalise(cleaned),
    categorySlug: slug ?? classify(cleaned),
    kbNumber,
    buildNumber: null,
    errorCode,
    // The phrase came from a query, not a document — there is no source page to
    // point at, and inventing one would put a fake citation in the database.
    sourceUrl: `discovery:${origin}`,
  };
}

/**
 * Falls back to the shared vertical classifier, then to `tech`.
 *
 * This previously returned one of five pre-pivot slugs — `error-codes`,
 * `how-to`, `app-not-working`, `update-problems`, `windows-updates` — none of
 * which survived the move to eight verticals. The slug lookup in `ingest` missed
 * every time, so every keyword this produced was stored with a null category and
 * could never be selected for generation.
 *
 * An error code or KB number in the phrase means it is a Windows fix-it query
 * regardless of what else the words suggest, so that is checked first.
 */
function classify(phrase: string): CategorySlug {
  if (/0x[0-9a-f]{4,8}|\bKB\s?\d{6,8}\b/i.test(phrase)) return 'windows';
  return classifyVertical(phrase) ?? 'tech';
}

function capitalise(phrase: string) {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FixDeskBot/0.1 (+https://example.com/about)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function describe(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export type { FeedItem };
