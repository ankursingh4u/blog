import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ArticleView } from '@/components/article/article-view';
import { prisma } from '@/lib/db';
import { getPublishedPost } from '@/lib/posts';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Articles in a sub-section: /tech/windows/fix-0x800f0922-windows-11.
 *
 * Segment names must match the sibling route at the same depth — Next.js rejects
 * `[category]/[sub]/[slug]` alongside `[category]/[slug]`. So `slug` here is the
 * sub-section and `post` is the article.
 *
 * The post is looked up by its own (child) category, then the parent segment is
 * verified against that category's actual parent — otherwise /money/windows/x
 * would serve the same article as /tech/windows/x and duplicate it.
 */
async function resolve(category: string, sub: string, slug: string) {
  const post = await getPublishedPost(sub, slug);
  if (!post || post.category.parent?.slug !== category) return null;
  return post;
}

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', category: { parentId: { not: null } } },
    select: { slug: true, category: { select: { slug: true, parent: { select: { slug: true } } } } },
  });

  return posts.flatMap((post) =>
    post.category.parent
      ? [{ category: post.category.parent.slug, slug: post.category.slug, post: post.slug }]
      : [],
  );
}

type Params = Promise<{ category: string; slug: string; post: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, slug, post: postSlug } = await params;
  const post = await resolve(category, slug, postSlug);
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } };

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

export default async function NestedPostPage({ params }: { params: Params }) {
  const { category, slug, post: postSlug } = await params;
  const post = await resolve(category, slug, postSlug);
  if (!post) notFound();

  return <ArticleView post={post} />;
}
