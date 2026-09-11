import type { Author, Category, Keyword } from '@prisma/client';
import { prisma } from '@/lib/db';
import { StringArray, parseJson } from '@/lib/json';
import { log } from '@/pipeline/log';

/**
 * Steps 2 and 3 — keyword selection and author assignment.
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
 * day" — implemented as at most 2 per category per run, which is the same thing
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
 * never be sourced — a full run of six skips and nothing generated.
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
 * Picks an author whose categoryFocus covers this category, avoiding the author
 * used for the previous post in the same run and the most recent published post.
 */
export async function assignAuthor(
  categorySlug: string,
  previousAuthorId: string | null,
): Promise<Author | null> {
  /**
   * House bylines only.
   *
   * Guests are readers whose submitted article was accepted. The fallback below
   * widens the pool to every author when none matches the category, so without
   * this filter a contributor's name would eventually appear on a generated
   * article they never wrote — which is a lie about a real, named person.
   */
  const authors = await prisma.author.findMany({ where: { isGuest: false } });
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
  const preferred = pool.filter((author) => !avoid.has(author.id));
  const finalPool = preferred.length > 0 ? preferred : pool;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
