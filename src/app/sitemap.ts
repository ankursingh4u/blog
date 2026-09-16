import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { absoluteUrl } from '@/lib/site';
import { categoryPath, postPath } from '@/lib/urls';

/**
 * Built per request, never cached.
 *
 * A cached sitemap is a sitemap that lies. It was `revalidate = 3600`, and
 * staying correct then depended on remembering to call `revalidatePath` from
 * every action that changes what is published — of the thirty write paths in
 * the admin, exactly one did. Publishing from anywhere else, deleting a post,
 * renaming an author or accepting a submission all left it an hour out of date,
 * and nothing surfaced that.
 *
 * Rendering it on demand deletes the whole class of bug: there is no cache to
 * invalidate and no bookkeeping to forget. The cost is a handful of indexed
 * queries on a file search engines fetch perhaps daily.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, authors] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED', publishedAt: { not: null } },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        featuredImage: true,
        title: true,
        category: { select: { slug: true, parent: { select: { slug: true } } } },
      },
      orderBy: { publishedAt: 'desc' },
    }),
    /**
     * Categories and authors carry a `lastmod` too, taken from the newest
     * article on them.
     *
     * Without it a crawler has nothing to judge a listing page by and re-reads
     * it on its own schedule. With it, a section that gained an article today
     * says so, and one that has not changed in a month says that too — which is
     * the entire purpose of the field.
     */
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: {
        slug: true,
        parent: { select: { slug: true } },
        posts: {
          where: { status: 'PUBLISHED', publishedAt: { not: null } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true },
        },
      },
    }),
    /**
     * Only authors with something published.
     *
     * Guest contributors get an author profile the moment their submission is
     * accepted, which is before the draft is published — and a profile listing
     * no articles is a thin page. Listing it invites a crawl of a page with
     * nothing on it and, at scale, is the sort of empty-profile sprawl that
     * drags a site's quality signals down.
     */
    prisma.author.findMany({
      where: { posts: { some: { status: 'PUBLISHED', publishedAt: { not: null } } } },
      select: {
        slug: true,
        posts: {
          where: { status: 'PUBLISHED', publishedAt: { not: null } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true },
        },
      },
    }),
  ]);

  // The homepage and the readable index both change whenever anything
  // publishes, so they inherit the newest article's date rather than carrying
  // none. `posts` is ordered newest-first above.
  const newest = posts[0]?.updatedAt;

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: newest, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/editorial-policy'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.3 },
    // The browsable archive, and the page inviting contributions. Both are real
    // destinations a reader can land on. /sitemaps is deliberately absent: it is
    // a redirect to this file, and a sitemap must not list redirects.
    { url: absoluteUrl('/archive'), lastModified: newest, changeFrequency: 'daily', priority: 0.3 },
    { url: absoluteUrl('/write'), changeFrequency: 'monthly', priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: absoluteUrl(categoryPath(category)),
      lastModified: category.posts[0]?.updatedAt,
      changeFrequency: 'daily' as const,
      // Sub-sections sit slightly below their parent in the hierarchy.
      priority: category.parent ? 0.7 : 0.8,
    })),
    ...authors.map((author) => ({
      url: absoluteUrl(`/author/${author.slug}`),
      lastModified: author.posts[0]?.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(postPath(post)),
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      // Image sitemap entries help Discover pick up the featured image.
      images: post.featuredImage
        ? [post.featuredImage.startsWith('http') ? post.featuredImage : absoluteUrl(post.featuredImage)]
        : undefined,
    })),
  ];
}
