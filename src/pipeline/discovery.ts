import { z } from 'zod';
import { decode, parseFeed, type CategorySlug, type FeedItem } from '@/pipeline/parser';
import { log } from '@/pipeline/log';
import { botUserAgent } from '@/lib/site';

/**
 * Topic discovery: what is trending right now, across all eight verticals.
 *
 * The primary source is Google News, read through its public RSS endpoints —
 * per-section feeds where Google publishes one, search feeds where it does not,
 * plus top stories. See `fetchTrendingByVertical`, which is the entry point.
 *
 * A note on what these actually are, because the naming in the wild is
 * misleading:
 *
 *   - **There is no official Google News API.** Google retired it in 2011 and
 *     never replaced it. What exists is the public Google News *RSS* endpoint,
 *     which needs no key and no account. That is what `fetchGoogleNews` uses.
 *     Paid third parties (NewsAPI, SerpApi) resell scraped results; none of them
 *     are Google, and all of them want a key. Not worth the dependency here.
 *
 *   - **There is no official Google Trends API either.** There is a public daily
 *     trending-searches RSS feed, which `fetchGoogleTrends` reads. Daily trends
 *     are dominated by sport, film and celebrity — which this site now covers,
 *     so it is a useful source rather than the near-always-empty one it was when
 *     the only vertical was Windows.
 *
 *   - **Google Suggest** (`fetchGoogleSuggest`) is the one that earns its place.
 *     It returns the real autocomplete phrases people type, which is exactly the
 *     long-tail keyword data an SEO blog wants. Undocumented but public, keyless,
 *     and stable for well over a decade.
 *
 * Every function here fails soft and returns an empty array. These are
 * third-party endpoints with no contract; a run must never abort because one of
 * them rate-limited or changed shape.
 */

const FETCH_TIMEOUT_MS = 12_000;
const UA = botUserAgent();

/* --------------------------------------------------------------- editions */

/**
 * Google News is regional. Every RSS endpoint takes `hl` (language), `gl`
 * (country) and `ceid` (the combined edition id), and the same feed returns
 * genuinely different stories per edition.
 *
 * India leads and is read first, because that is the primary audience; the US
 * edition is read second for reach. Order matters downstream: ingest keeps the
 * first writer for a duplicate phrase, so an India story wins a tie.
 */
export interface NewsEdition {
  id: string;
  hl: string;
  gl: string;
  ceid: string;
  /** How many items to keep per feed. India is weighted roughly 2:1. */
  weight: number;
}

export const NEWS_EDITIONS: readonly NewsEdition[] = [
  { id: 'IN', hl: 'en-IN', gl: 'IN', ceid: 'IN:en', weight: 2 },
  { id: 'US', hl: 'en-US', gl: 'US', ceid: 'US:en', weight: 1 },
] as const;

function editionQuery(edition: NewsEdition): string {
  return `hl=${edition.hl}&gl=${edition.gl}&ceid=${encodeURIComponent(edition.ceid)}`;
}

/* -------------------------------------------------------------- verticals */

/**
 * How each of the eight verticals is discovered.
 *
 * Google News publishes a curated section feed for only some of them. Where a
 * section exists it is used, because Google's own editorial ranking is a far
 * better trending signal than a keyword search. The rest fall back to search
 * queries, which return the same RSS shape.
 *
 * `topic` is the section name in the `/rss/headlines/section/topic/{TOPIC}`
 * path. That URL 302s to a stable `/rss/topics/{id}` URL; `fetch` follows
 * redirects by default, so it is left as the readable form.
 *
 * `suggestSeeds` feed Google autocomplete, which is where the long-tail
 * evergreen keywords come from, as opposed to today's headlines.
 */
export interface VerticalSource {
  slug: CategorySlug;
  /** Google News section, when one covers the vertical. */
  topic: string | null;
  /** Search queries, used instead of or alongside the section. */
  queries: readonly string[];
  suggestSeeds: readonly string[];
}

export const VERTICAL_SOURCES: readonly VerticalSource[] = [
  {
    slug: 'tech',
    topic: 'TECHNOLOGY',
    queries: ['smartphone launch', 'AI tools'],
    suggestSeeds: ['best phone under', 'how to speed up laptop', 'is it worth upgrading to'],
  },
  {
    slug: 'entertainment',
    topic: 'ENTERTAINMENT',
    queries: ['streaming release date'],
    suggestSeeds: ['where to watch', 'what to watch on netflix', 'when does season'],
  },
  {
    slug: 'sports',
    topic: 'SPORTS',
    queries: ['transfer news'],
    suggestSeeds: ['how does the offside rule', 'when is the next match', 'points table'],
  },
  {
    slug: 'money',
    topic: 'BUSINESS',
    queries: ['interest rates', 'personal finance'],
    suggestSeeds: ['how to save tax', 'best savings account', 'how much should i invest'],
  },
  {
    slug: 'health',
    topic: 'HEALTH',
    queries: ['nutrition study', 'fitness research'],
    suggestSeeds: ['how much sleep do i need', 'how many steps a day', 'is it healthy to'],
  },
  // Google News has no gaming, travel or education section, so these are
  // search-only. The queries are broad on purpose: the section feeds already
  // supply volume, and these three need a wide net to fill a daily run.
  {
    slug: 'gaming',
    topic: null,
    queries: ['video game release', 'game patch update', 'gaming hardware'],
    suggestSeeds: ['best settings for', 'how long to beat', 'is the game worth it'],
  },
  {
    slug: 'travel',
    topic: null,
    queries: ['flight prices', 'visa rules travel', 'tourism destination'],
    suggestSeeds: ['cheapest time to fly to', 'do i need a visa for', 'how much does a trip to'],
  },
  {
    slug: 'education',
    topic: null,
    queries: ['exam results', 'university admissions', 'scholarship announcement'],
    suggestSeeds: ['how to prepare for', 'what to study for', 'admission last date'],
  },
] as const;

/**
 * Keyword signals per vertical, used to classify a term that arrives with no
 * section attached — Google Trends and autocomplete, mainly.
 *
 * Order matters: the first vertical whose pattern matches wins, so the narrower
 * patterns are listed before the broad ones. `windows` is checked ahead of
 * `tech` because a Windows term is always the more specific of the two.
 */
const VERTICAL_PATTERNS: ReadonlyArray<{ slug: CategorySlug; pattern: RegExp }> = [
  {
    slug: 'windows',
    pattern:
      /\b(windows\s?1[01]|windows update|microsoft|kb\d{6,8}|0x[0-9a-f]{4,8}|bsod|blue screen|file explorer|defender)\b/i,
  },
  {
    slug: 'gaming',
    // Inflections matter: a bare `\bgame\b` misses "gameplay" and "gamers",
    // which is how most gaming headlines are actually worded.
    pattern:
      /\b(game(s|play|r|rs)?|gaming|playstation|ps5|xbox|nintendo|steam deck|esports|dlc|patch notes|gta|fortnite|minecraft|valorant)\b/i,
  },
  {
    slug: 'sports',
    pattern:
      /\b(match|cricket|football|soccer|ipl|nba|nfl|fifa|olympic|tournament|league|score|innings|goal|transfer|wicket|test series)\b/i,
  },
  {
    slug: 'entertainment',
    pattern:
      /\b(film|movie|trailer|netflix|prime video|disney|hotstar|box office|season \d|episode|actor|actress|album|song|bollywood|celebrity)\b/i,
  },
  {
    slug: 'money',
    pattern:
      /\b(stock|share price|sensex|nifty|market|invest|mutual fund|tax|gst|inflation|interest rate|salary|loan|emi|ipo|rupee|budget)\b/i,
  },
  {
    slug: 'health',
    // "lose weight" as well as "weight loss" — both phrasings are common, and
    // matching only the noun form misses the way people actually search.
    pattern:
      /\b(health|diet|nutrition|calorie|sleep|fitness|workout|exercise|vitamin|disease|symptom|doctor|mental health|weight loss|lose weight|obesity)\b/i,
  },
  {
    slug: 'travel',
    pattern:
      /\b(travel|fly|flying|flights?|airline|airfare|visa|passport|hotel|tourist|tourism|itinerary|holiday|trip|destination|airport)\b/i,
  },
  {
    slug: 'education',
    pattern:
      /\b(exam|result|admission|university|college|school|syllabus|neet|jee|upsc|cbse|scholarship|admit card|semester|degree|course)\b/i,
  },
  {
    slug: 'tech',
    pattern:
      /\b(phone|smartphone|iphone|android|samsung|laptop|app|software|ai\b|chatgpt|gadget|processor|battery|5g|update)\b/i,
  },
];

/**
 * Terms that match a vertical but never make a worthwhile page.
 *
 * Trending searches skew hard towards individual people and one-off events —
 * "who won", a footballer's name, a death announcement. Those are news, and this
 * site does not do breaking news; it does the explainer behind it.
 */
const NOISE =
  /\b(died|death|obituary|passed away|arrested|murder|rape|suicide|horoscope|lottery|result today live|vs\s+\w+\s+live|dream11|betting odds)\b/i;

/**
 * Classifies a bare term into a vertical, or null if it belongs in none.
 *
 * This replaced a single Windows-only relevance regex. That regex required every
 * discovered term to mention Windows or Microsoft, which meant seven of the
 * eight verticals could never receive a keyword no matter what the feeds
 * returned.
 */
export function classifyVertical(term: string): CategorySlug | null {
  if (NOISE.test(term)) return null;
  return VERTICAL_PATTERNS.find((v) => v.pattern.test(term))?.slug ?? null;
}

/** Kept as the boolean form for the callers that only need a yes/no. */
export function isRelevant(term: string): boolean {
  return classifyVertical(term) !== null;
}

/** Every autocomplete seed across every vertical, tagged with its vertical. */
export const SUGGEST_SEEDS: ReadonlyArray<{ seed: string; slug: CategorySlug }> =
  VERTICAL_SOURCES.flatMap((v) => v.suggestSeeds.map((seed) => ({ seed, slug: v.slug })));

async function fetchText(url: string, accept: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: accept },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/* ------------------------------------------------------------ Google News */

/**
 * Google News RSS search. Public, keyless.
 *
 * Headlines come back as "Headline - Publisher"; the publisher suffix is
 * stripped so it does not end up inside a keyword phrase.
 */
export async function fetchGoogleNews(
  query: string,
  limit = 12,
  edition: NewsEdition = NEWS_EDITIONS[0],
): Promise<FeedItem[]> {
  const url =
    'https://news.google.com/rss/search' +
    `?q=${encodeURIComponent(query)}&${editionQuery(edition)}`;

  try {
    const xml = await fetchText(url, 'application/rss+xml, application/xml, text/xml');
    const items = parseFeed(xml).slice(0, limit);
    return items.map((item) => ({ ...item, title: stripPublisher(item.title) }));
  } catch (error) {
    log.warn(`discovery: Google News "${query}" (${edition.id}) failed — ${describe(error)}`);
    return [];
  }
}

/**
 * A Google News **section** feed — the curated "Technology", "Sports" and so on
 * that the site's front page shows as tabs.
 *
 * Preferred over a search query wherever a section exists: the ordering is
 * Google's own editorial ranking of what is big right now, which is exactly the
 * trending signal this pipeline wants, and a search query cannot reproduce it.
 *
 * The `/headlines/section/topic/{TOPIC}` path 302s to a stable `/topics/{id}`
 * URL. `fetch` follows redirects by default, so the readable path is kept.
 */
export async function fetchGoogleNewsTopic(
  topic: string,
  limit = 12,
  edition: NewsEdition = NEWS_EDITIONS[0],
): Promise<FeedItem[]> {
  const url =
    `https://news.google.com/rss/headlines/section/topic/${encodeURIComponent(topic)}` +
    `?${editionQuery(edition)}`;

  try {
    const xml = await fetchText(url, 'application/rss+xml, application/xml, text/xml');
    const items = parseFeed(xml).slice(0, limit);
    return items.map((item) => ({ ...item, title: stripPublisher(item.title) }));
  } catch (error) {
    log.warn(`discovery: Google News topic ${topic} (${edition.id}) failed — ${describe(error)}`);
    return [];
  }
}

/** Google News top stories — the "Your briefing" feed, unfiltered by section. */
export async function fetchTopStories(
  limit = 12,
  edition: NewsEdition = NEWS_EDITIONS[0],
): Promise<FeedItem[]> {
  const url = `https://news.google.com/rss?${editionQuery(edition)}`;

  try {
    const xml = await fetchText(url, 'application/rss+xml, application/xml, text/xml');
    const items = parseFeed(xml).slice(0, limit);
    return items.map((item) => ({ ...item, title: stripPublisher(item.title) }));
  } catch (error) {
    log.warn(`discovery: Google News top stories (${edition.id}) failed — ${describe(error)}`);
    return [];
  }
}

export interface TrendingItem {
  item: FeedItem;
  slug: CategorySlug;
  /** Which channel produced it, for the run log. */
  origin: string;
}

/**
 * The main trending sweep: every vertical, across every edition.
 *
 * Per vertical this reads the Google News section feed where one exists, plus
 * that vertical's search queries. Items keep the vertical of the feed they came
 * out of rather than being re-classified, since the source feed is the stronger
 * signal.
 *
 * Top stories are read separately and *are* classified, because that feed is
 * mixed by definition; anything that classifies into no vertical is dropped.
 *
 * Feeds are read per edition sequentially rather than all at once. These are
 * unauthenticated endpoints and a burst of parallel requests is the fastest way
 * to get rate-limited; a daily run has no reason to be in a hurry.
 */
export async function fetchTrendingByVertical(
  perFeed = 8,
  editions: readonly NewsEdition[] = NEWS_EDITIONS,
): Promise<TrendingItem[]> {
  const out: TrendingItem[] = [];

  for (const edition of editions) {
    const limit = perFeed * edition.weight;

    for (const vertical of VERTICAL_SOURCES) {
      if (vertical.topic) {
        const items = await fetchGoogleNewsTopic(vertical.topic, limit, edition);
        out.push(
          ...items.map((item) => ({
            item,
            slug: vertical.slug,
            origin: `news-topic:${vertical.topic}:${edition.id}`,
          })),
        );
      }

      for (const query of vertical.queries) {
        const items = await fetchGoogleNews(query, limit, edition);
        out.push(
          ...items.map((item) => ({
            item,
            slug: vertical.slug,
            origin: `news-search:${query}:${edition.id}`,
          })),
        );
      }
    }

    // Mixed feed — classify, and drop what fits nowhere.
    for (const item of await fetchTopStories(limit, edition)) {
      const slug = classifyVertical(item.title);
      if (slug) out.push({ item, slug, origin: `news-top:${edition.id}` });
    }
  }

  log.info(
    `discovery: Google News → ${out.length} item(s) across ${VERTICAL_SOURCES.length} ` +
      `vertical(s) and ${editions.length} edition(s)`,
  );
  return out;
}

/** "KB5044284 breaks printing - Ars Technica" -> "KB5044284 breaks printing" */
export function stripPublisher(title: string): string {
  return title.replace(/\s+[-–—]\s+[^-–—]{2,40}$/, '').trim();
}

/* --------------------------------------------------------- Google Suggest */

const SuggestResponse = z.tuple([z.string(), z.array(z.string())]).rest(z.unknown());

/**
 * Autocomplete expansion for one seed phrase.
 *
 * `client=firefox` returns plain JSON — `["seed", ["suggestion", …]]` — rather
 * than the JSONP the browser client returns.
 */
export async function fetchGoogleSuggest(seed: string): Promise<string[]> {
  const url =
    'https://suggestqueries.google.com/complete/search' +
    `?client=firefox&hl=en&q=${encodeURIComponent(seed)}`;

  try {
    const body = await fetchText(url, 'application/json, text/javascript');
    const parsed = SuggestResponse.safeParse(JSON.parse(body));
    if (!parsed.success) {
      log.warn(`discovery: Google Suggest "${seed}" returned an unexpected shape`);
      return [];
    }
    return parsed.data[1].map((s) => s.trim()).filter(Boolean);
  } catch (error) {
    log.warn(`discovery: Google Suggest "${seed}" failed — ${describe(error)}`);
    return [];
  }
}

export interface SuggestedPhrase {
  phrase: string;
  slug: CategorySlug;
}

/**
 * Runs every seed across every vertical and returns the deduped union.
 *
 * A suggestion inherits the vertical of the seed that produced it, falling back
 * to classifying the phrase itself. The seed is the better signal — "best
 * settings for" is a gaming seed even when the completion never says "game" —
 * but the classifier catches completions that have drifted off their seed, which
 * autocomplete does often.
 */
export async function fetchAllSuggestions(): Promise<SuggestedPhrase[]> {
  const results = await Promise.all(
    SUGGEST_SEEDS.map(async ({ seed, slug }) => ({
      slug,
      phrases: await fetchGoogleSuggest(seed),
    })),
  );

  const seen = new Set<string>();
  const kept: string[] = [];
  const out: SuggestedPhrase[] = [];

  for (const { slug, phrases } of results) {
    for (const phrase of phrases) {
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (NOISE.test(phrase)) continue;
      // Too short to be a searchable intent, too long to be a real query.
      if (phrase.length < 12 || phrase.length > 90) continue;
      if (kept.some((k) => isNearDuplicate(k, key))) continue;

      kept.push(key);
      out.push({ phrase, slug: classifyVertical(phrase) ?? slug });
    }
  }

  return out;
}

/**
 * Autocomplete returns long ladders of the same query — "admission last date",
 * "admission last date 2026", "admission last date school", and six more.
 *
 * Exact-match deduping keeps every one of them, and each would become its own
 * near-identical article at full generation cost. A completion that merely
 * extends a phrase already kept is treated as the same intent.
 */
function isNearDuplicate(kept: string, candidate: string): boolean {
  const [shorter, longer] = kept.length <= candidate.length ? [kept, candidate] : [candidate, kept];
  // Anchored at a word boundary so "admission last date" absorbs "admission
  // last date 2026" without "best phone" swallowing "best phones to avoid".
  return longer.startsWith(`${shorter} `);
}

/* ---------------------------------------------------------- Google Trends */

/**
 * Daily trending searches for a region, classified into verticals.
 *
 * Returns terms only — the feed's item links point back to Trends itself, which
 * is no use as a research source.
 *
 * This used to be filtered down to Windows terms and so was empty almost every
 * day. Across eight general-interest verticals it is a much richer source: daily
 * trends are dominated by sport, film and celebrity, which are now three of the
 * things this site covers rather than noise to be discarded. The `NOISE` filter
 * still drops the deaths, arrests and live-score queries that trend constantly
 * and make poor evergreen pages.
 */
export async function fetchGoogleTrends(geo = 'IN'): Promise<SuggestedPhrase[]> {
  const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;

  try {
    const xml = await fetchText(url, 'application/rss+xml, application/xml, text/xml');
    const titles = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
      .map((m) => /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(m[0])?.[1] ?? '')
      .map((t) => decode(t))
      .filter(Boolean);

    const out: SuggestedPhrase[] = [];
    for (const title of titles) {
      const slug = classifyVertical(title);
      if (slug) out.push({ phrase: title, slug });
    }
    return out;
  } catch (error) {
    log.warn(`discovery: Google Trends (${geo}) failed — ${describe(error)}`);
    return [];
  }
}

/* ------------------------------------------------- solution-source lookup */

export interface SolutionSource {
  url: string;
  title: string;
}

/**
 * Finds documentation pages about a specific problem, widening the research step
 * beyond its fixed list of fallback URLs.
 *
 * This queries **Microsoft Learn's own search**, which publishes results as RSS
 * and needs no key. Two reasons it is not a general web search:
 *
 *   1. Learn search returns Microsoft documentation directly, which is the
 *      "official docs first" rule in the editorial policy, enforced by the
 *      choice of index rather than by filtering afterwards.
 *
 *   2. The premise of this site is that the existing search results for these
 *      queries are scraped forum posts repeating each other. Feeding those back
 *      into the generator would reproduce exactly the content the site exists to
 *      replace — and the quality gate could not tell the difference, because a
 *      confidently-worded forum answer looks just like a source.
 *
 * Results are still host-checked on the way out. Learn search should only ever
 * return Microsoft URLs, but the check is cheap and this feeds the generator.
 *
 * (Google News RSS is used for *topic* discovery above, where it is excellent.
 * It is no use here: it indexes news publishers, and `site:` operators are
 * ignored, so every result gets discarded.)
 */
const TRUSTED_HOSTS = [
  'support.microsoft.com',
  'learn.microsoft.com',
  'docs.microsoft.com',
  'techcommunity.microsoft.com',
  'answers.microsoft.com',
  'blogs.windows.com',
  'msrc.microsoft.com',
];

export function isTrustedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return TRUSTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * A trusted *host* is not enough.
 *
 * `learn.microsoft.com/answers/` is community Q&A — user-submitted threads that
 * happen to sit on a Microsoft domain. It is precisely the forum content the
 * host allow-list exists to keep out, and the host check waves it through.
 *
 * Learn search also pads thin result sets with whatever it has, so a query for a
 * hex error code comes back with unrelated recent threads. Both are filtered
 * here: documentation paths only, and the result has to look like it is about
 * the thing that was asked for.
 */
const DOC_PATHS = [
  '/troubleshoot/',
  '/windows/deployment/',
  '/windows/client-management/',
  '/windows-hardware/',
  '/windows/release-health/',
  '/windows/security/',
  '/windows/configuration/',
  '/previous-versions/',
];

const COMMUNITY_PATHS = ['/answers/', '/questions/', '/users/'];

export function isUsefulSolutionUrl(url: string, title: string, query: string): boolean {
  if (!isTrustedHost(url)) return false;

  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return false;
  }

  if (COMMUNITY_PATHS.some((p) => path.includes(p))) return false;
  if (DOC_PATHS.some((p) => path.includes(p))) return true;

  // Outside the known documentation trees, require the result to actually
  // mention something distinctive from the query.
  return sharesDistinctiveTerm(query, `${title} ${path}`);
}

/**
 * Words too common to prove two texts are about the same thing.
 *
 * The first row is the Windows-troubleshooting vocabulary this started as. The
 * rest are ordinary English words long enough to survive the four-character
 * filter — needed once matching moved beyond Windows, where "about", "after" and
 * "their" appear in nearly every headline and would match anything.
 */
const GENERIC = new Set([
  'windows', 'update', 'updates', 'error', 'errors', 'fix', 'how', 'the', 'and',
  'for', 'not', 'with', 'from', 'code', 'problem', 'issue', 'help',
  'what', 'when', 'where', 'which', 'while', 'best', 'after', 'before', 'about',
  'their', 'there', 'this', 'that', 'they', 'them', 'then', 'than', 'your',
  'have', 'has', 'will', 'into', 'over', 'more', 'most', 'been', 'being', 'also',
  'some', 'such', 'only', 'just', 'like', 'make', 'made', 'need', 'used', 'using',
  'does', 'done', 'said', 'says', 'year', 'years', 'time', 'times', 'here',
  'new', 'news', 'first', 'last', 'next', 'back', 'down', 'out', 'off', 'now',
  'day', 'days', 'week', 'month', 'top', 'get', 'gets', 'can', 'could', 'would',
  'should', 'may', 'might', 'his', 'her', 'its', 'our', 'you', 'all', 'one', 'two',
  '2024', '2025', '2026', '2027',
]);

/** The distinctive (non-generic) terms of a phrase, lowercased and deduped. */
function distinctiveTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9.]+/)
        .filter((t) => t.length >= 4 && !GENERIC.has(t)),
    ),
  ];
}

function sharesDistinctiveTerm(query: string, haystack: string): boolean {
  const target = haystack.toLowerCase();
  return distinctiveTerms(query).some((term) => target.includes(term));
}

/** How many of a query's distinctive terms appear in the haystack. */
function distinctiveOverlap(query: string, haystack: string): number {
  const target = haystack.toLowerCase();
  return distinctiveTerms(query).filter((term) => target.includes(term)).length;
}

/* ------------------------------------------ general-interest source lookup */

/**
 * Publisher feeds per vertical, used to find sources for the seven
 * general-interest verticals.
 *
 * Why RSS and not the Google News link the keyword arrived with: a
 * `news.google.com/rss/articles/…` URL does not redirect to the publisher. It
 * serves a JavaScript interstitial that stays on Google's domain and contains no
 * outbound link to the article, so there is nothing to fetch and nothing to cite.
 * Google News is a discovery channel here, not a source of record.
 *
 * These feeds, by contrast, publish the publisher's own article URLs, which are
 * fetchable, citable and stable. Every one was checked live before being listed.
 *
 * `windows` is absent deliberately — that vertical has its own path through
 * `findSolutionSources`, which prefers Microsoft's own documentation.
 */
export const VERTICAL_FEEDS: Partial<Record<CategorySlug, readonly string[]>> = {
  tech: [
    'https://feeds.arstechnica.com/arstechnica/technology-lab',
    'https://www.theverge.com/rss/index.xml',
  ],
  entertainment: ['https://variety.com/feed/', 'https://www.hollywoodreporter.com/feed/'],
  // ESPNcricinfo's feed parses, but its article pages answer 403 to a declared
  // bot. That is a deliberate block and is left respected rather than worked
  // around with a browser user-agent.
  sports: ['https://feeds.bbci.co.uk/sport/rss.xml'],
  money: ['https://www.livemint.com/rss/money', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
  health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://www.thehindu.com/sci-tech/health/feeder/default.rss',
  ],
  gaming: ['https://www.eurogamer.net/feed', 'https://www.polygon.com/rss/index.xml'],
  travel: ['https://thepointsguy.com/feed/', 'https://skift.com/feed/'],
  education: [
    'https://indianexpress.com/section/education/feed/',
    'https://www.thehindu.com/education/feeder/default.rss',
  ],
};

/**
 * General news feeds, read for every vertical after its own.
 *
 * A trending story often breaks in the national press before the specialist
 * outlet covers it, and three of the verticals have no dedicated Indian feed at
 * all. These fill that gap.
 */
export const GENERAL_FEEDS: readonly string[] = [
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://www.thehindu.com/news/national/feeder/default.rss',
];

/**
 * Hosts a general-interest article may cite.
 *
 * Two groups: the publishers behind the feeds above, and the official bodies
 * that are the primary authority for a vertical. The same principle as
 * `TRUSTED_HOSTS` for Windows — an allow-list means a stray URL cannot become a
 * citation, and it keeps the "official sources first" rule enforceable rather
 * than aspirational.
 */
const GENERAL_TRUSTED_HOSTS = [
  // Publishers.
  'arstechnica.com', 'theverge.com', 'variety.com', 'hollywoodreporter.com',
  'espncricinfo.com', 'cricinfo.com', 'bbc.co.uk', 'bbc.com', 'livemint.com',
  'thehindu.com', 'eurogamer.net', 'polygon.com', 'thepointsguy.com', 'skift.com',
  'indianexpress.com', 'reuters.com', 'apnews.com',
  // Official bodies, by vertical.
  'rbi.org.in', 'sebi.gov.in', 'incometax.gov.in', 'nseindia.com', 'bseindia.com',
  'upsc.gov.in', 'cbse.gov.in', 'nta.ac.in', 'ugc.gov.in', 'education.gov.in',
  'who.int', 'nhs.uk', 'cdc.gov', 'nih.gov', 'mohfw.gov.in',
  'iata.org', 'icao.int', 'mea.gov.in', 'dgca.gov.in', 'incredibleindia.gov.in',
  'fifa.com', 'olympics.com', 'icc-cricket.com', 'bcci.tv',
];

export function isTrustedGeneralHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return GENERAL_TRUSTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Finds citable sources for a general-interest keyword.
 *
 * Reads the vertical's publisher feeds plus the general news feeds, then keeps
 * the items that are actually about the same story, measured as overlap of
 * distinctive terms between the keyword and the headline.
 *
 * The threshold is deliberately high. A first cut accepted two shared terms, and
 * fell back to one when nothing scored better; probing it showed what that
 * produces — a story about festive-season airfares matched a credit-card review,
 * and a lung-surgery study matched an article about a powerlifter. A genuine
 * match scores far higher (a cricket final matched its report on six terms), so
 * three separates signal from coincidence cleanly.
 *
 * Returning nothing is a valid and common outcome: a publisher feed carries only
 * the last few dozen items, so most specific stories will not be in it. That is
 * the right answer. An unrelated source is worse than no source, because the
 * generator is instructed to write only what its sources say — hand it the wrong
 * article and it will confidently write that article's facts into this one.
 */
const MIN_TERM_OVERLAP = 3;
export async function findGeneralSources(
  query: string,
  slug: CategorySlug,
  limit = 4,
): Promise<SolutionSource[]> {
  const feeds = [...(VERTICAL_FEEDS[slug] ?? []), ...GENERAL_FEEDS];
  const scored: Array<SolutionSource & { score: number }> = [];
  const seen = new Set<string>();

  for (const feed of feeds) {
    let items: FeedItem[];
    try {
      const xml = await fetchText(feed, 'application/rss+xml, application/xml, text/xml');
      items = parseFeed(xml);
    } catch (error) {
      log.warn(`discovery: feed ${feed} failed — ${describe(error)}`);
      continue;
    }

    for (const item of items) {
      if (!item.link || seen.has(item.link)) continue;
      if (!isTrustedGeneralHost(item.link)) continue;
      seen.add(item.link);

      const score = distinctiveOverlap(query, `${item.title} ${item.description}`);
      if (score > 0) scored.push({ url: item.link, title: item.title, score });
    }
  }

  const chosen = scored
    .filter((s) => s.score >= MIN_TERM_OVERLAP)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  log.info(
    chosen.length > 0
      ? `discovery: ${chosen.length} source(s) for "${query}" (${slug}), ` +
          `best overlap ${chosen[0].score} term(s)`
      : `discovery: no publisher source matched "${query}" (${slug}) at ` +
          `${MIN_TERM_OVERLAP}+ shared terms`,
  );

  return chosen.map(({ url, title }) => ({ url, title }));
}

export async function findSolutionSources(query: string, limit = 4): Promise<SolutionSource[]> {
  const url =
    'https://learn.microsoft.com/api/search/rss' +
    `?search=${encodeURIComponent(query)}&locale=en-us`;

  let items: FeedItem[];
  try {
    const xml = await fetchText(url, 'application/rss+xml, application/xml, text/xml');
    items = parseFeed(xml);
  } catch (error) {
    log.warn(`discovery: Learn search "${query}" failed — ${describe(error)}`);
    return [];
  }

  const trusted: SolutionSource[] = [];
  let rejected = 0;

  for (const item of items) {
    if (!isUsefulSolutionUrl(item.link, item.title, query)) {
      rejected += 1;
      continue;
    }
    if (trusted.some((s) => s.url === item.link)) continue;
    trusted.push({ url: item.link, title: item.title });
    if (trusted.length >= limit) break;
  }

  if (rejected > 0) {
    log.info(
      `discovery: "${query}" — ${rejected} result(s) discarded (community Q&A or off-topic)`,
    );
  }
  return trusted;
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
