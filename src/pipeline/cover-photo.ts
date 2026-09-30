import { searchImages, storeImage, type ImageCandidate, type StoredImage } from '@/lib/images';
import { log } from '@/pipeline/log';

/**
 * Step 8b — an openly-licensed photograph for the cover.
 *
 * `featuredImage` holds one of two things: the branded card rendered by /api/og,
 * which carries no credit, or a real photograph, which does. `coverPhoto()` in
 * components/ui/cover-art.tsx tells them apart by the presence of a licence.
 * A photograph found here replaces the card.
 *
 * This logic was written and hardened in scripts/apply-cover-photos.ts against
 * 34 real articles; it lives here now so the pipeline and that script run the
 * same code rather than two implementations that drift.
 *
 * **On honesty.** Openly-licensed archives essentially never hold a photograph
 * of this week's event. What is achievable is topical and credited — a stadium
 * for a match report, a trading floor for a markets piece — and what must never
 * happen is an image that looks like it depicts the event when it does not. That
 * is why the subject comes from TOPIC_RULES rather than free-text search on the
 * headline, why nothing is stored when no rule and no fallback returns anything
 * usable, and why the photographer and licence render under every cover.
 */

/** Words that carry no search value in a headline. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this',
  'that', 'these', 'those', 'what', 'why', 'how', 'when', 'where', 'who', 'which', 'you',
  'your', 'we', 'our', 'they', 'their', 'he', 'she', 'his', 'her', 'not', 'no', 'yes',
  'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'do', 'does', 'did',
  'have', 'has', 'had', 'about', 'into', 'over', 'after', 'before', 'more', 'most', 'new',
  'now', 'know', 'need', 'get', 'got', 'here', 'there', 'confirmed', 'explained', 'really',
  'actually', 'everything', 'anything', 'something', 'says', 'said', 'up', 'out', 'off',
  'so', 'than', 'then', 'them', 'still', 'just', 'also', 'if', 'all', 'one', 'two',
]);

/**
 * Subject rules, tried before anything else.
 *
 * Free-text search against Openverse is unreliable for news headlines, because
 * the index is Flickr and Wikimedia Commons where titles are things like
 * "Project 365 #200". Two failure modes showed up immediately: no match at all
 * (an admissions story returned sand dunes, the largest unrelated image in the
 * set), and false friends — "Transfer news LIVE" about football matched a
 * photograph of a money-transfer counter, which is worse than no match because
 * it looks deliberate.
 *
 * So the subject is decided from the headline here, by hand, and the search runs
 * on a concrete noun phrase that reliably returns good photography. The first
 * rule whose pattern matches wins, so order matters: put the specific ones
 * first.
 */
export interface TopicRule {
  test: RegExp;
  query: string;
  /**
   * Verticals this rule is meant for. A rule whose `cats` contains the post's
   * own category is preferred over one that merely matched a word, which is what
   * stops "Google's AI mode for tracking flight prices" — a travel story — from
   * being illustrated with a data centre because `ai` appears in the headline.
   */
  cats?: string[];
}

export const TOPIC_RULES: TopicRule[] = [
  // Sport — the code has to distinguish cricket from football before the generic
  // "transfer"/"match" words send both to the same place.
  { test: /\b(cricket|test match|odi|t20|pietersen|white-?ball|wicket|batting)\b/i, query: 'cricket match stadium', cats: ['sports'] },
  { test: /\b(liverpool|arsenal|chelsea|milan|madrid|premier league|football|soccer|endrick|transfer)\b/i, query: 'football stadium match', cats: ['sports'] },
  { test: /\b(ufc|fight|boxing|mma)\b/i, query: 'boxing ring fight', cats: ['sports'] },

  // Gaming
  { test: /\b(playstation|xbox|nintendo|console|gamescom|dualshock|steam deck)\b/i, query: 'video game console controller', cats: ['gaming'] },
  { test: /\b(gaming pc|graphics card|gpu|hardware crisis)\b/i, query: 'gaming computer setup', cats: ['gaming'] },
  { test: /\b(game|games|gamer)\b/i, query: 'video game controller', cats: ['gaming'] },

  // Tech
  // Kept deliberately broad. A narrower "smartphone screen close up hand"
  // returned one usable image and then fell through to the tech fallback, so
  // phone stories ended up illustrated with laptops — further off-topic than the
  // dated-but-correct handsets this query returns. Openverse's commercially
  // licensed pool simply has little recent phone photography.
  { test: /\b(iphone|apple|samsung|galaxy|oppo|xiaomi|huawei|pixel|foldable|fold|smartphone|phone)\b/i, query: 'smartphone mobile phone', cats: ['tech','windows'] },
  { test: /\b(windows|microsoft|kb\d|error code|driver|update)\b/i, query: 'laptop computer keyboard', cats: ['tech','windows'] },
  { test: /\b(ai|artificial intelligence|chatbot|model|algorithm)\b/i, query: 'server data centre technology', cats: ['tech','windows'] },

  // Money
  { test: /\b(rbi|reserve bank|central bank|repo rate|interest rates?|savers)\b/i, query: 'reserve bank india building', cats: ['money'] },
  { test: /\b(gold|bullion)\b/i, query: 'gold bars bullion', cats: ['money'] },
  { test: /\b(tariff|trade|export|import|bombardier|planemaker)\b/i, query: 'cargo shipping containers port', cats: ['money'] },
  { test: /\b(cpi|inflation|rate hike|stocks?|market|shares|investor|forecast)\b/i, query: 'stock exchange trading screen', cats: ['money'] },

  // Health
  { test: /\b(ebola|outbreak|virus|mosquito|measles|disease|cdc|who)\b/i, query: 'hospital medical laboratory', cats: ['health'] },
  { test: /\b(nutrition|toddler food|diet|milk|packaged food)\b/i, query: 'fresh vegetables healthy food', cats: ['health'] },
  { test: /\b(drug|clinical|trial|biological age)\b/i, query: 'laboratory research scientist', cats: ['health'] },
  { test: /\b(strength training|fitness|exercise|workout)\b/i, query: 'gym weights fitness', cats: ['health'] },

  // Travel
  { test: /\b(airfare|flight|airline|airport|aviation)\b/i, query: 'airport terminal aircraft', cats: ['travel'] },
  { test: /\b(hotel|tourism|visa|destination|travel)\b/i, query: 'travel suitcase destination', cats: ['travel'] },

  // Education
  { test: /\b(admission|seat|allotment|university|college|kcet|ug|pg|campus)\b/i, query: 'university campus building', cats: ['education'] },
  { test: /\b(exam|result|student|scholarship)\b/i, query: 'students classroom study', cats: ['education'] },

  // Entertainment
  { test: /\b(film|movie|cinema|box office|trailer|netflix|streaming)\b/i, query: 'cinema theatre screen', cats: ['entertainment'] },
  { test: /\b(music|song|album|rapper|singer|macklemore|concert)\b/i, query: 'concert stage microphone', cats: ['entertainment'] },
];

/** Last resort per vertical, when no subject rule matched. */
export const CATEGORY_QUERY: Record<string, string> = {
  tech: 'technology laptop computer',
  windows: 'computer keyboard desk',
  entertainment: 'cinema film theatre',
  sports: 'stadium sport athletics',
  money: 'finance stock market chart',
  health: 'health fitness wellbeing',
  gaming: 'video game controller console',
  travel: 'travel airport landscape',
  education: 'university library students',
};

export function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Normalised photo title, used to spot the same image indexed twice. */
export function titleKey(title: string): string {
  return `t:${words(title).sort().join(' ')}`;
}

/**
 * How many of the query's words appear in the candidate's own title.
 *
 * Ranking on size alone is what produced a sand-dune photograph for an
 * admissions story: the query matched nothing, so the biggest unrelated image in
 * the result set won. Relevance has to dominate the ordering.
 */
function overlap(query: string, c: ImageCandidate): number {
  const q = new Set(words(query));
  if (q.size === 0) return 0;
  const t = new Set(words(c.title));
  let hits = 0;
  for (const w of q) if (t.has(w)) hits += 1;
  return hits;
}

/**
 * Sources that refuse a programmatic fetch.
 *
 * Flickr returns 403 to anything that is not a browser, which is its right, and
 * it accounted for every one of the 14 articles that still had no image after
 * the fall-through was added. The licence permits the copy; the CDN just will
 * not serve it to a bot. Rather than dress the crawler up as Chrome to get
 * around that, these are ranked last — still tried, but only once the sources
 * that will actually serve us are exhausted.
 */
const BLOCKS_BOTS = /flickr/i;

/** Landscape and large wins — these are rendered 1200px wide and cropped wide. */
function quality(c: ImageCandidate): number {
  const ratio = c.height > 0 ? c.width / c.height : 0;
  const landscape = ratio >= 1.2 && ratio <= 2.4 ? 1200 : 0;
  const fetchable = BLOCKS_BOTS.test(c.sourceName) ? 0 : 4000;
  return fetchable + landscape + Math.min(c.width, 3000) / 2;
}

/** One retry: Openverse times out often enough that a single attempt loses picks. */
async function search(q: string, sources?: string[]): Promise<ImageCandidate[]> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await searchImages(q, 20, sources);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt === 2) log.warn(`cover: search "${q}" failed twice — ${msg}`);
    }
  }
  return [];
}

export interface CoverPick {
  /**
   * Ranked, best first. Storing can fail for reasons only discoverable by
   * fetching — the file turns out to be larger than the 8 MB cap, or the host
   * returns 403 to a hotlinked request — and on the first full run that killed
   * 22 of 34 posts. Keeping the whole shortlist lets the caller fall through to
   * the next usable image instead of leaving the article with none.
   */
  candidates: ImageCandidate[];
  query: string;
  /** Which strategy produced it. */
  via: 'subject' | 'category';
}

/**
 * `used` carries the ids and title keys already handed out, so several articles
 * sharing a subject rule do not all end up with the same photograph.
 */
/**
 * The search phrase for a headline, and the fallback behind it.
 *
 * Split out from `findCoverPhoto` because this is the decision that determines
 * whether a picture is on-topic, and it is the half that can be tested without
 * a network call.
 */
export function subjectQueryFor(
  title: string,
  categorySlug: string,
): { subject: string | null; category: string } {
  // Every rule that matches, with the ones meant for this vertical first. The
  // preference is what stops "Google's AI mode for tracking flight prices" — a
  // travel story — being illustrated with a data centre because `ai` matched.
  const matching = TOPIC_RULES.filter((r) => r.test.test(title));
  const preferred = matching.filter((r) => !r.cats || r.cats.includes(categorySlug));
  const rule = preferred[0] ?? matching[0];

  return {
    subject: rule?.query ?? null,
    category: CATEGORY_QUERY[categorySlug] ?? categorySlug,
  };
}

export async function findCoverPhoto(
  title: string,
  categorySlug: string,
  used: Set<string>,
): Promise<CoverPick | null> {
  const { subject, category: categoryQuery } = subjectQueryFor(title, categorySlug);
  const rule = subject ? { query: subject } : null;
  const attempts: Array<{ query: string; via: 'subject' | 'category'; sources?: string[] }> = [];
  if (rule) attempts.push({ query: rule.query, via: 'subject' });
  attempts.push({ query: categoryQuery, via: 'category' });
  // Last resort: whole result sets come back Flickr-only for some subjects, and
  // Flickr will not serve them to us. Ask Wikimedia specifically rather than
  // leaving the article without a photograph.
  if (rule) attempts.push({ query: rule.query, via: 'subject', sources: ['wikimedia'] });
  attempts.push({ query: categoryQuery, via: 'category', sources: ['wikimedia'] });

  // Every attempt contributes to one shortlist rather than the first non-empty
  // one winning outright. Returning early looked reasonable but meant that when
  // an attempt came back entirely Flickr — unfetchable — the store loop burned
  // through all of it and gave up without ever running the Wikimedia attempt
  // queued behind it.
  const shortlist: ImageCandidate[] = [];
  let chosenVia: 'subject' | 'category' = 'category';
  let chosenQuery = categoryQuery;

  for (const { query, via, sources } of attempts) {
    const results = await search(query, sources);
    if (!results.length) continue;

    // Fetchability first: a perfectly relevant image we cannot download is worth
    // less than a slightly looser one we can. Then relevance, then how well it
    // renders at 1200px. A zero-overlap result is still acceptable here — the
    // query is already a concrete subject, so anything it returned is on-topic
    // even when the photographer's title does not repeat the words.
    const ranked = [...results].sort(
      (a, b) =>
        Number(BLOCKS_BOTS.test(a.sourceName)) - Number(BLOCKS_BOTS.test(b.sourceName)) ||
        overlap(query, b) - overlap(query, a) ||
        quality(b) - quality(a),
    );

    // Skip anything already given to another post. Several articles legitimately
    // share a subject — two admissions stories, three football ones — and
    // handing them all the same stadium photograph makes the site look
    // automated, which it is, but not like that.
    //
    // Keyed on the title as well as the id: Openverse indexes the same
    // photograph from several upstream sources, each with its own id, so
    // id-only deduplication still handed one phone review out five times.
    const fresh = ranked.filter(
      (c) =>
        !used.has(c.id) &&
        !used.has(titleKey(c.title)) &&
        !shortlist.some((s) => s.id === c.id || titleKey(s.title) === titleKey(c.title)),
    );
    if (!fresh.length) continue;

    if (shortlist.length === 0) {
      chosenVia = via;
      chosenQuery = query;
    }
    shortlist.push(...fresh);
  }

  return shortlist.length ? { candidates: shortlist, query: chosenQuery, via: chosenVia } : null;
}

/**
 * Finds a photograph and stores it, walking the shortlist until one downloads.
 *
 * Returns null rather than throwing when nothing is usable: a missing photograph
 * downgrades the post to the branded card, it does not fail the run.
 */
export async function attachCoverPhoto({
  title,
  categorySlug,
  slug,
  used,
}: {
  title: string;
  categorySlug: string;
  slug: string;
  used: Set<string>;
}): Promise<StoredImage | null> {
  const pick = await findCoverPhoto(title, categorySlug, used);
  if (!pick) {
    log.info(`cover: no usable photograph for "${title}" — keeping the generated card`);
    return null;
  }

  for (const candidate of pick.candidates) {
    try {
      const stored = await storeImage(candidate, slug);
      // Marked only on success. A candidate that 403s has not been "used" by
      // anyone and the next post should still be allowed to try it.
      used.add(candidate.id);
      used.add(titleKey(candidate.title));
      log.info(
        `cover: ${pick.via} "${pick.query}" → ${stored.credit.creator} ` +
          `(${stored.credit.license}) ${stored.url}`,
      );
      return stored;
    } catch (error) {
      log.warn(
        `cover: "${candidate.title}" could not be stored — ` +
          `${error instanceof Error ? error.message : error}`,
      );
    }
  }

  log.warn(
    `cover: all ${pick.candidates.length} candidate(s) for "${title}" failed to download — ` +
      'keeping the generated card',
  );
  return null;
}

/**
 * Photographs already in use across the site, as ids and title keys.
 *
 * Seeded from stored credits so a run does not hand out a picture that an
 * earlier run already used. Ids are not stored on the post, so this matches on
 * the title key, which is what catches the same photograph indexed under
 * several Openverse ids anyway.
 */
export function usedKeysFromCredits(credits: Array<{ title?: string } | null>): Set<string> {
  const used = new Set<string>();
  for (const credit of credits) {
    if (credit?.title) used.add(titleKey(credit.title));
  }
  return used;
}
