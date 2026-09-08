import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ArticleView } from '@/components/article/article-view';
import { CategoryView } from '@/components/category/category-view';

import { prisma } from '@/lib/db';
import { getCategoryBySlug, getPublishedPost } from '@/lib/posts';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Two different things live at this depth:
 *
 *   /tech/windows      — a sub-section listing (slug is a child category)
 *   /tech/some-post    — an article in a top-level category
 *
 * Sub-sections win the lookup, so a post may not take the slug of an existing
 * child category. The seed keeps those namespaces apart.
 */
async function resolve(categorySlug: string, slug: string) {
  const child = await getCategoryBySlug(slug);
  if (child && child.parent?.slug === categorySlug) {
    return { kind: 'category' as const, category: child };
  }

  const post = await getPublishedPost(categorySlug, slug);
  // A post whose category is nested does not live here — it belongs at
  // /parent/child/slug, so serving it here too would duplicate the content.
  if (post && !post.category.parentId) return { kind: 'post' as const, post };

  return null;
}

export async function generateStaticParams() {
  const [posts, children] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED', category: { parentId: null } },
      select: { slug: true, category: { select: { slug: true } } },
    }),
    prisma.category.findMany({
      where: { parentId: { not: null } },
      select: { slug: true, parent: { select: { slug: true } } },
    }),
  ]);

  return [
    ...posts.map((post) => ({ category: post.category.slug, slug: post.slug })),
    ...children.flatMap((child) =>
      child.parent ? [{ category: child.parent.slug, slug: child.slug }] : [],
    ),
  ];
}

type Params = Promise<{ category: string; slug: string }>;
type Search = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, slug } = await params;
  const found = await resolve(category, slug);
  if (!found) return { title: 'Not found', robots: { index: false, follow: false } };

  if (found.kind === 'category') {
    return buildMetadata({
      title: `${found.category.name} — ${found.category.parent?.name ?? ''}`.trim().replace(/—$/, ''),
      description: found.category.description,
      path: `/${category}/${slug}`,
    });
  }

  const { post } = found;
  return buildMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription,
    path: post.href,
    image: post.featuredImage,
    type: 'article',
    publishedTime: post.publishedAt?.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    authorName: post.author.name,
    section: post.category.name,
  });
}

export default async function CategoryOrPostPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { category, slug } = await params;
  const found = await resolve(category, slug);
  if (!found) notFound();

  if (found.kind === 'category') {
    const { page } = await searchParams;
    return <CategoryView category={found.category} page={page} />;
  }

  return <ArticleView post={found.post} />;
}
