import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublishedPosts, searchPosts } from '@/lib/posts';

/**
 * Paged article feed, used by the infinite-scroll lists.
 *
 * The first page is always server-rendered by the page itself — this endpoint
 * only serves what comes *after* it. That keeps the initial paint and the
 * crawlable markup identical to what they were before infinite scroll existed;
 * a crawler that never scrolls still sees a full first page and can reach the
 * rest through the numbered pagination fallback.
 *
 * Dates go over the wire as ISO strings. The client revives them, because the
 * card renders a `<time>` element and formats the date.
 */
const Query = z.object({
  categorySlug: z.string().max(64).optional(),
  authorSlug: z.string().max(64).optional(),
  /** Free-text search. Takes precedence over the category/author filters. */
  q: z.string().max(120).optional(),
  skip: z.coerce.number().int().min(0).max(100_000).default(0),
  // Bounded so a hand-edited URL cannot ask for the whole table in one request.
  take: z.coerce.number().int().min(1).max(24).default(12),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad query parameters.' }, { status: 400 });
  }

  const { categorySlug, authorSlug, q, skip, take } = parsed.data;

  // Ask for one more than requested: if it comes back, there is another page.
  const posts = q
    ? await searchPosts(q, take + 1, skip)
    : await getPublishedPosts({ categorySlug, authorSlug, skip, take: take + 1 });
  const hasMore = posts.length > take;

  return NextResponse.json({ posts: posts.slice(0, take), hasMore });
}
