import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  FaqArray,
  ScreenshotArray,
  SourceRefArray,
  StringArray,
  ImageCreditSchema,
  EMPTY_CREDIT,
  parseJson,
  type FaqItem,
  type Screenshot,
  type SourceRef,
} from '@/lib/json';
import { readingTime } from '@/lib/utils';
import { toPlainText } from '@/lib/markdown';
import { categoryRefSelect, postPath } from '@/lib/urls';

const cardSelect = {
  id: true,
  title: true,
  slug: true,
  quickAnswer: true,
  metaDescription: true,
  featuredImage: true,
  imageCredit: true,
  affectedBuilds: true,
  publishedAt: true,
  updatedAt: true,
  lastVerifiedAt: true,
  testedOnBuild: true,
  category: { select: categoryRefSelect },
  author: { select: { name: true, slug: true, avatar: true } },
} satisfies Prisma.PostSelect;

export type PostCard = ReturnType<typeof toCard>;

function toCard(post: Prisma.PostGetPayload<{ select: typeof cardSelect }>) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    href: postPath(post),
    quickAnswer: post.quickAnswer,
    excerpt: post.metaDescription || toPlainText(post.quickAnswer, 160),
    featuredImage: post.featuredImage,
    imageCredit: parseJson(post.imageCredit, ImageCreditSchema, EMPTY_CREDIT),
    affectedBuilds: parseJson(post.affectedBuilds, StringArray, []),
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    lastVerifiedAt: post.lastVerifiedAt,
    testedOnBuild: post.testedOnBuild,
    category: post.category,
    author: post.author,
  };
}

const publishedWhere = {
  status: 'PUBLISHED',
  publishedAt: { not: null },
} satisfies Prisma.PostWhereInput;

interface PostFilter {
  categorySlug?: string;
  authorSlug?: string;
}

/**
 * A category filter matches the category itself *and* its children, so /tech
 * lists everything under /tech/windows too. Filtering by a child slug matches
 * only that child.
 */
function whereFor(opts: PostFilter): Prisma.PostWhereInput {
  const and: Prisma.PostWhereInput[] = [];
  if (opts.categorySlug) {
    and.push({
      OR: [
        { category: { slug: opts.categorySlug } },
        { category: { parent: { slug: opts.categorySlug } } },
      ],
    });
  }
  if (opts.authorSlug) and.push({ author: { slug: opts.authorSlug } });
  return and.length ? { ...publishedWhere, AND: and } : publishedWhere;
}

export const getPublishedPosts = cache(
  async (opts: PostFilter & { take?: number; skip?: number } = {}) => {
    const posts = await prisma.post.findMany({
      where: whereFor(opts),
      orderBy: { publishedAt: 'desc' },
      take: opts.take,
      skip: opts.skip,
      select: cardSelect,
    });
    return posts.map(toCard);
  },
);

export const countPublishedPosts = cache(async (opts: PostFilter = {}) =>
  prisma.post.count({ where: whereFor(opts) }),
);

/** Top-level categories only, each with its children — this drives the nav. */
export const getCategories = cache(async () =>
  prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: 'asc' },
    include: { children: { orderBy: { position: 'asc' } } },
  }),
);

/** Every category, parents and children alike — for the sitemap and admin. */
export const getAllCategories = cache(async () =>
  prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { parent: { select: { name: true, slug: true } } },
  }),
);

export const getCategoryBySlug = cache(async (slug: string) =>
  prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { orderBy: { position: 'asc' } },
    },
  }),
);

export const getAuthorBySlug = cache(async (slug: string) =>
  prisma.author.findUnique({ where: { slug } }),
);

export const getAuthors = cache(async () => prisma.author.findMany({ orderBy: { name: 'asc' } }));

const fullInclude = {
  category: { include: { parent: { select: { name: true, slug: true } } } },
  author: true,
} satisfies Prisma.PostInclude;

/**
 * Full post for the article page. `categorySlug` is the post's own (leaf)
 * category — `windows` for /tech/windows/x, `tech` for /tech/x. The route
 * resolves the nesting before calling this. Returns null unless published.
 */
export const getPublishedPost = cache(async (categorySlug: string, slug: string) => {
  const post = await prisma.post.findFirst({
    where: { slug, status: 'PUBLISHED', publishedAt: { not: null }, category: { slug: categorySlug } },
    include: fullInclude,
  });
  if (!post) return null;
  return hydrate(post);
});

/** Same shape as the public article, but ignores status — used by /admin preview. */
export const getPostForPreview = cache(async (id: string) => {
  const post = await prisma.post.findUnique({ where: { id }, include: fullInclude });
  return post ? hydrate(post) : null;
});

export type FullPost = NonNullable<Awaited<ReturnType<typeof getPublishedPost>>>;

function hydrate(post: Prisma.PostGetPayload<{ include: typeof fullInclude }>) {
  const faq: FaqItem[] = parseJson(post.faq, FaqArray, []);
  const sources: SourceRef[] = parseJson(post.sourceUrls, SourceRefArray, []);
  const screenshots: Screenshot[] = parseJson(post.screenshots, ScreenshotArray, []);
  return {
    ...post,
    href: postPath(post),
    affectedBuilds: parseJson(post.affectedBuilds, StringArray, []),
    relatedSlugs: parseJson(post.relatedSlugs, StringArray, []),
    faq,
    sources,
    screenshots,
    authorFocus: parseJson(post.author.categoryFocus, StringArray, []),
    readingMinutes: readingTime(post.body),
    wordCount: post.body.trim().split(/\s+/).length,
  };
}

/**
 * Related posts: the editor-confirmed slugs first, topped up with the newest
 * posts from the same category so an article never renders a thin "related" rail.
 */
export const getRelatedPosts = cache(async (post: FullPost, limit = 4) => {
  const chosen = post.relatedSlugs.length
    ? await prisma.post.findMany({
        where: { slug: { in: post.relatedSlugs }, ...publishedWhere },
        select: cardSelect,
      })
    : [];

  /**
   * Top up in widening rings. A small category cannot fill the rail on its own
   * — Education has three posts — and stopping at the category boundary left
   * the sidebar visibly empty and wasted the internal linking.
   */
  const rings: Prisma.PostWhereInput[] = [
    // 1. Same category.
    { categoryId: post.categoryId },
    // 2. The surrounding family: siblings under the same parent, or the
    //    children of this category if it is itself a parent.
    post.category.parentId
      ? { category: { parentId: post.category.parentId } }
      : { OR: [{ category: { parentId: post.categoryId } }, { categoryId: post.categoryId }] },
    // 3. Anywhere, newest first.
    {},
  ];

  for (const ring of rings) {
    if (chosen.length >= limit) break;
    const exclude = [post.slug, ...chosen.map((p) => p.slug)];
    const fill = await prisma.post.findMany({
      where: { ...publishedWhere, ...ring, slug: { notIn: exclude } },
      orderBy: { publishedAt: 'desc' },
      take: limit - chosen.length,
      select: cardSelect,
    });
    chosen.push(...fill);
  }

  return chosen.slice(0, limit).map(toCard);
});

/**
 * Keyword search over title, quick answer and body. SQLite has no full-text
 * index here, so this is a bounded LIKE scan — fine at this corpus size, and
 * the one place to swap for Postgres `tsvector` after the move.
 */
export const searchPosts = cache(async (query: string, take = 30, skip = 0) => {
  const q = query.trim();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).slice(0, 6);
  const posts = await prisma.post.findMany({
    where: {
      ...publishedWhere,
      AND: terms.map((term) => ({
        OR: [
          { title: { contains: term } },
          { quickAnswer: { contains: term } },
          { body: { contains: term } },
          { affectedBuilds: { contains: term } },
        ],
      })),
    },
    orderBy: { publishedAt: 'desc' },
    take,
    skip,
    select: cardSelect,
  });
  return posts.map(toCard);
});
