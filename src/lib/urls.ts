/**
 * Single source of truth for public URL shapes.
 *
 * Categories may nest one level (see prisma/schema.prisma), so a post's path
 * depends on whether its category has a parent:
 *
 *   top-level category     /tech
 *   child category         /tech/windows
 *   post in a top-level    /tech/some-post
 *   post in a child        /tech/windows/some-post
 *
 * Nothing outside this module should build a category or post path by hand —
 * that is how the two shapes drift apart across sitemap, feed, cards and admin.
 */

export interface CategoryRef {
  slug: string;
  parent?: { slug: string } | null;
}

export interface PostRef {
  slug: string;
  category: CategoryRef;
}

/** `/tech` or `/tech/windows`. */
export function categoryPath(category: CategoryRef): string {
  return category.parent ? `/${category.parent.slug}/${category.slug}` : `/${category.slug}`;
}

/** `/tech/some-post` or `/tech/windows/some-post`. */
export function postPath(post: PostRef): string {
  return `${categoryPath(post.category)}/${post.slug}`;
}

/** `/author/maya-orsini`. */
export function authorPath(author: { slug: string }): string {
  return `/author/${author.slug}`;
}

/**
 * Route params for a post, matching the App Router segment names.
 *
 * Next.js requires the same param name at the same depth, so the routes are
 * `[category]/[slug]` and `[category]/[slug]/[post]` — meaning `slug` is the
 * article for a top-level post and the sub-section for a nested one.
 */
export function postRouteParams(post: PostRef): {
  category: string;
  slug: string;
  post?: string;
} {
  return post.category.parent
    ? { category: post.category.parent.slug, slug: post.category.slug, post: post.slug }
    : { category: post.category.slug, slug: post.slug };
}

/** Prisma select fragment that supplies everything the helpers above need. */
export const categoryRefSelect = {
  name: true,
  slug: true,
  accent: true,
  parent: { select: { name: true, slug: true } },
} as const;
