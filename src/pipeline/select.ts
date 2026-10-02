import type { Author, Category, Keyword } from '@prisma/client';
import { prisma } from '@/lib/db';
import { StringArray, parseJson } from '@/lib/json';
import { getSetting } from '@/lib/settings';
import { HOUSE_SLUGS, fixedBylineFor } from '@/lib/bylines';
import { log } from '@/pipeline/log';

/**
 * Steps 2 and 3, keyword selection and author assignment.
 */

export interface SelectedJob {
  keyword: Keyword;
  category: Category;
  author: Author;
}

/**
 * Picks up to `count` queued keywords, spread across categories.
 *
 * The spread rule from the brief is "never 3 posts in the same category on one
 * day", implemented as at most 2 per category per run, which is the same thing
 * at the default of 2-3 posts per day and holds if the setting is raised.
 *
 * **Source-bearing keywords come first, then newest.** A keyword discovered from
 * Google News carries the article's own URL; one discovered from autocomplete or
 * trends carries only a `discovery:` marker, because a search query has no page
 * behind it. Only the first kind is reliably researchable: publisher feeds carry
 * today's news, so a trending headline matches one and an evergreen query like
 * "what to study for pilot" does not.
 *
 * Ordering by date alone put this exactly backwards. Ingest writes the feeds,
 * then news, then autocomplete, so newest-first served the autocomplete phrases
 * every time and the run burned its whole candidate pool on keywords that could
 * never be sourced, a full run of six skips and nothing generated.
 */
export async function selectKeywords(
  count: number,
  /**
   * Categories to leave alone this run. Used by the backfill to hold a section
   * back once it has hit its share: Windows keywords come with Microsoft's own
   * documentation behind them and so almost always find a source, where the
   * general verticals succeed about a third of the time. Left unchecked the
   * back-catalogue would crowd out the other seven sections.
   */
  excludeCategorySlugs: string[] = [],
): Promise<Keyword[]> {
  const queued = await prisma.keyword.findMany({
    where: {
      status: 'QUEUED',
      ...(excludeCategorySlugs.length
        ? { NOT: { category: { slug: { in: excludeCategorySlugs } } } }
        : {}),
    },
    // `sourceUrl` sorts descending so `https://…` precedes `discovery:…`.
    orderBy: [{ sourceUrl: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(count * 6, 30),
  });

  const perCategory = new Map<string, number>();
  const chosen: Keyword[] = [];

  for (const keyword of queued) {
    if (chosen.length >= count) break;
    const key = keyword.categoryId ?? 'uncategorised';
    const used = perCategory.get(key) ?? 0;
    if (used >= 2) continue;
    perCategory.set(key, used + 1);
    chosen.push(keyword);
  }

  // If the spread rule starved the run, fill the remainder in plain order
  // rather than publishing fewer posts than asked for.
  if (chosen.length < count) {
    for (const keyword of queued) {
      if (chosen.length >= count) break;
      if (chosen.some((k) => k.id === keyword.id)) continue;
      chosen.push(keyword);
    }
  }

  log.info(`select: ${chosen.length} of ${queued.length} queued keyword(s)`);
  return chosen;
}

/**
 * Picks the author for a generated post.
 *
 * If AI_AUTHOR_SLUG names an existing house author, every generated post is
 * bylined to them and the rotation below is skipped. Otherwise: an author whose
 * categoryFocus covers this category, avoiding the author used for the previous
 * post in the same run and on the most recent published post.
 */
export async function assignAuthor(
  categorySlug: string,
  previousAuthorId: string | null,
  /** Authors already given a draft in this cycle. Skipped while any remain. */
  usedAuthorIds: string[] = [],
): Promise<Author | null> {
  /**
   * A section with a standing byline goes to that person, every time.
   *
   * Takes precedence over AI_AUTHOR_SLUG. That setting pins *every* generated
   * post to one name, which is the thing this replaces: tech, money and travel
   * belong to the founder, games to Adarsh, entertainment to Anushka, and the
   * rest flip. Leaving the pin in charge would quietly collapse all eight
   * sections back onto a single byline.
   */
  const standing = fixedBylineFor(categorySlug);
  if (standing) {
    const author = await prisma.author.findFirst({
      // isGuest for the same reason the rotation filters on it: a contributor's
      // name must never appear on something they did not write.
      where: { slug: standing, isGuest: false },
    });
    if (author) return author;
    log.warn(
      `select: "${categorySlug}" is assigned to "${standing}" but no house author has ` +
        'that slug, falling back to the rotation. Run the seed-authors task.',
    );
  }

  const pinnedSlug = (await getSetting('AI_AUTHOR_SLUG')).trim();
  if (pinnedSlug) {
    const pinned = await prisma.author.findFirst({
      where: { slug: pinnedSlug, isGuest: false },
    });
    if (pinned) return pinned;
    // Naming an author who does not exist yet is the expected order of events -
    // the setting ships with a default and the row is created afterwards, so
    // this falls through to the rotation rather than failing the run. Said out
    // loud, because silently ignoring it is how the byline quietly stays wrong.
    log.warn(
      `select: AI_AUTHOR_SLUG is "${pinnedSlug}" but no house author has that slug, ` +
        'falling back to the author rotation. Create the author in /admin/authors.',
    );
  }

  /**
   * House bylines only.
   *
   * Guests are readers whose submitted article was accepted. The fallback below
   * widens the pool to every author when none matches the category, so without
   * this filter a contributor's name would eventually appear on a generated
   * article they never wrote, which is a lie about a real, named person.
   */
  /*
   * The masthead, and nobody else.
   *
   * `isGuest: false` alone still includes the pre-pivot personas, who sit in
   * the database because they own the back catalogue and who keep a
   * categoryFocus from that era. The rotation duly picked one of them for a
   * fresh article: a new piece bylined to a person who does not exist, on a
   * site whose whole masthead change was about real names.
   *
   * They keep their own articles. They do not get given new ones.
   */
  const authors = await prisma.author.findMany({
    where: { isGuest: false, slug: { in: HOUSE_SLUGS } },
  });
  if (authors.length === 0) return null;

  const matching = authors.filter((author) =>
    parseJson(author.categoryFocus, StringArray, []).includes(categorySlug),
  );
  const pool = matching.length > 0 ? matching : authors;

  const lastPublished = await prisma.post.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: { authorId: true },
  });

  const avoid = new Set([previousAuthorId, lastPublished?.authorId].filter(Boolean) as string[]);

  /**
   * Names already used in this cycle outrank "not the previous one".
   *
   * Avoiding only the immediately preceding author let one person collect two
   * of eight drafts in a single round, which reads as a newsroom of two people.
   * A cycle should look like the masthead it has. Exhausting the list is fine
   * and falls through to the weaker rules rather than failing.
   */
  const unused = pool.filter((author) => !usedAuthorIds.includes(author.id));
  const base = unused.length > 0 ? unused : pool;

  const preferred = base.filter((author) => !avoid.has(author.id));
  const finalPool = preferred.length > 0 ? preferred : base;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
