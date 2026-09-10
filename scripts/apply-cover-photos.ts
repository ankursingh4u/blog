import 'dotenv/config';
import { prisma } from '@/lib/db';
import { searchImages, storeImage, type ImageCandidate } from '@/lib/images';

/**
 * Gives each article an openly-licensed photograph instead of the generated
 * OG card.
 *
 * `Post.featuredImage` holds one of two things: the branded card rendered by
 * /api/og, which carries no credit, or a real photograph, which does. Storing a
 * photo here replaces the card as both the in-page cover and `og:image` — see
 * `coverPhoto()` in components/ui/cover-art.tsx, which uses the presence of a
 * licence to tell them apart.
 *
 * Dry run by default. Applying pictures to 34 news articles unreviewed is how a
 * site ends up illustrating a story about one thing with a photograph of
 * another, so the intended flow is: run it, read the picks, then `--apply`.
 *
 *   npx tsx scripts/apply-cover-photos.ts                  # show picks, change nothing
 *   npx tsx scripts/apply-cover-photos.ts --apply          # store them
 *   npx tsx scripts/apply-cover-photos.ts --slug=foo --apply
 *   npx tsx scripts/apply-cover-photos.ts --apply --force  # redo posts that already have one
 *
 * On relevance: the subject comes from TOPIC_RULES below, not from the headline
 * text, with a per-vertical fallback behind it. That yields topical imagery — a
 * stadium for a match report, a trading floor for a markets piece — and not a
 * photograph of the specific event, which openly-licensed archives essentially
 * never have for this week's news.
 *
 * Generic-but-on-topic is the honest option here. The failure to avoid is an
 * image that looks like it depicts the event when it does not, which is why the
 * credit line naming the photographer and licence renders under every cover.
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
interface TopicRule {
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

const TOPIC_RULES: TopicRule[] = [
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

/**
 * Last resort per vertical, when no subject rule matched.
 */
const CATEGORY_QUERY: Record<string, string> = {
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

/** Normalised photo title, used to spot the same image indexed twice. */
function titleKey(title: string): string {
  return `t:${words(title).sort().join(' ')}`;
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * How many of the query's words appear in the candidate's own title.
 *
 * Ranking on size alone is what produced a sand-dune photograph for an
 * admissions story: the query matched nothing, so the biggest unrelated image in
 * the result set won. Relevance has to dominate the ordering, and a candidate
 * that shares no word with the query is not a match at all.
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
 * around that, these are ranked last — they are still tried, but only once the
 * sources that will actually serve us are exhausted.
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
async function search(q: string, label: string, sources?: string[]): Promise<ImageCandidate[]> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await searchImages(q, 20, sources);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt === 2) console.log(`   ! ${label} "${q}" failed twice: ${msg}`);
    }
  }
  return [];
}

export interface Pick {
  /**
   * Ranked, best first. Storing can fail for reasons only discoverable by
   * fetching — the file turns out to be larger than the 8 MB cap, or the host
   * returns 403 to a hotlinked request — and on the first full run that killed
   * 22 of 34 posts. Handing the caller the whole shortlist lets it fall through
   * to the next usable image instead of leaving the article with none.
   */
  candidates: ImageCandidate[];
  query: string;
  /** Which strategy produced it, for the review output. */
  via: 'subject' | 'category';
}

/**
 * `used` carries the ids already handed out in this run, so several articles
 * sharing a subject rule do not all end up with the same photograph.
 */
async function bestFor(
  title: string,
  categorySlug: string,
  used: Set<string>,
): Promise<Pick | null> {
  // Every rule that matches, with the ones meant for this vertical first.
  const matching = TOPIC_RULES.filter((r) => r.test.test(title));
  const preferred = matching.filter((r) => !r.cats || r.cats.includes(categorySlug));
  const rule = preferred[0] ?? matching[0];

  const categoryQuery = CATEGORY_QUERY[categorySlug] ?? categorySlug;
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
    const results = await search(query, via, sources);
    if (!results.length) continue;

    // Rank by how well the candidate's own title matches the subject phrase,
    // then by how well it will render at 1200px wide. Unlike a headline search,
    // a zero-overlap result is still acceptable: the query is already a concrete
    // subject, so anything it returned is on-topic even when the photographer's
    // title does not repeat the words.
    // Fetchability first: a perfectly relevant image we cannot download is worth
    // less than a slightly looser one we can. Then relevance, then how well it
    // renders at 1200px.
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

async function main() {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', ...(slug ? { slug } : {}) },
    include: { category: true },
    orderBy: { publishedAt: 'desc' },
  });

  console.log(`${posts.length} published post(s); ${apply ? 'APPLYING' : 'dry run — nothing will change'}\n`);

  let specific = 0;
  let generic = 0;
  let skipped = 0;
  let none = 0;
  const used = new Set<string>();

  /**
   * Cover paths already in use, across the whole table rather than this run.
   * Seeded from the database so a second, partial run cannot hand out a
   * photograph that an earlier one already assigned.
   */
  const taken = new Set(
    (
      await prisma.post.findMany({
        where: { featuredImage: { not: null }, ...(slug ? { NOT: { slug } } : {}) },
        select: { featuredImage: true, slug: true },
      })
    )
      .filter((p) => p.featuredImage && (!slug || p.slug !== slug))
      .map((p) => p.featuredImage as string),
  );

  for (const post of posts) {
    const hasPhoto = Boolean(post.imageCredit && post.imageCredit !== '');
    if (hasPhoto && !force) {
      skipped += 1;
      continue;
    }

    const pick = await bestFor(post.title, post.category.slug, used);
    if (!pick) {
      none += 1;
      console.log(`NO MATCH  [${post.category.slug}] ${post.title}\n`);
      continue;
    }

    const clean = (t: string) => t.replace(/<[^>]*>/g, '').trim().slice(0, 80);
    console.log(`[${post.category.slug}] ${post.title}`);
    console.log(`   match : ${pick.via === 'subject' ? 'subject' : 'category fallback'}  q="${pick.query}"`);

    if (!apply) {
      const c = pick.candidates[0];
      console.log(`   image : ${clean(c.title)}`);
      console.log(`   by    : ${c.creator} — ${c.license}`);
      console.log(`   size  : ${c.width}x${c.height}\n`);
      used.add(c.id);
      used.add(titleKey(c.title));
      if (pick.via === 'subject') specific += 1;
      else generic += 1;
      continue;
    }

    // Try each candidate in turn; oversize files and 403s are only discoverable
    // by fetching, so the first choice is not always the one that lands.
    let stored: Awaited<ReturnType<typeof storeImage>> | null = null;
    let chosen: ImageCandidate | null = null;
    for (const candidate of pick.candidates.slice(0, 40)) {
      try {
        const attempt = await storeImage(candidate, post.slug);

        // Storage is content-addressed, so the same photograph always lands on
        // the same path. That makes it the reliable duplicate check across runs
        // — the in-memory `used` set only covers the current one, which is how
        // eight posts ended up sharing a cover over several partial runs.
        if (taken.has(attempt.url)) {
          console.log(`   skip  : ${clean(candidate.title)} — already used by another post`);
          continue;
        }

        stored = attempt;
        chosen = candidate;
        break;
      } catch (error) {
        console.log(`   skip  : ${clean(candidate.title)} — ${error instanceof Error ? error.message : error}`);
      }
    }

    if (!stored || !chosen) {
      none += 1;
      console.log('   -> no usable image in this result set\n');
      continue;
    }

    used.add(chosen.id);
    used.add(titleKey(chosen.title));
    taken.add(stored.url);
    if (pick.via === 'subject') specific += 1;
    else generic += 1;

    await prisma.post.update({
      where: { id: post.id },
      data: { featuredImage: stored.url, imageCredit: JSON.stringify(stored.credit) },
    });
    console.log(`   image : ${clean(chosen.title)}`);
    console.log(`   by    : ${chosen.creator} — ${chosen.license}`);
    console.log(`   -> stored ${stored.url}\n`);
  }

  console.log(
    `\n${specific} matched the headline, ${generic} fell back to the vertical, ` +
      `${skipped} already had a photo, ${none} unmatched`,
  );
  if (!apply && specific + generic > 0) console.log('Re-run with --apply to store them.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
