import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { absoluteUrl } from '@/lib/site';
import { categoryPath, postPath } from '@/lib/urls';

export const revalidate = 3600;

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
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { slug: true, parent: { select: { slug: true } } },
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
      select: { slug: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/editorial-policy'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.3 },
    // The readable index, and the page inviting contributions. Both are real
    // destinations a reader might land on, so they belong here.
    { url: absoluteUrl('/sitemaps'), changeFrequency: 'daily', priority: 0.3 },
    { url: absoluteUrl('/write'), changeFrequency: 'monthly', priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: absoluteUrl(categoryPath(category)),
      changeFrequency: 'daily' as const,
      // Sub-sections sit slightly below their parent in the hierarchy.
      priority: category.parent ? 0.7 : 0.8,
    })),
    ...authors.map((author) => ({
      url: absoluteUrl(`/author/${author.slug}`),
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
