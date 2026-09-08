import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Container, JsonLd, buttonClass } from '@/components/ui/primitives';
import { InfinitePosts } from '@/components/infinite-posts';
import { AdSlot } from '@/components/ad-slot';

import { countPublishedPosts, getPublishedPosts } from '@/lib/posts';
import { categoryPath } from '@/lib/urls';
import { breadcrumbLd, collectionLd, jsonLdGraph } from '@/lib/seo';

export const PER_PAGE = 12;

export interface CategoryViewModel {
  name: string;
  slug: string;
  description: string;
  parent?: { name: string; slug: string } | null;
  children?: Array<{ name: string; slug: string }>;
}

/**
 * Listing page for a category, shared by top-level categories (/tech) and
 * sub-sections (/tech/windows). A top-level listing includes posts from its
 * children — see whereFor() in src/lib/posts.ts.
 */
export async function CategoryView({
  category,
  page,
}: {
  category: CategoryViewModel;
  page?: string;
}) {
  const path = categoryPath(category);
  const current = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);

  const [posts, total] = await Promise.all([
    getPublishedPosts({ categorySlug: category.slug, take: PER_PAGE, skip: (current - 1) * PER_PAGE }),
    countPublishedPosts({ categorySlug: category.slug }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (current > totalPages && total > 0) notFound();

  const crumbs = [
    { name: 'Home', path: '/' },
    ...(category.parent ? [{ name: category.parent.name, path: `/${category.parent.slug}` }] : []),
    { name: category.name, path },
  ];

  const structuredData = jsonLdGraph(
    collectionLd({
      name: category.name,
      description: category.description,
      path,
      items: posts.map((p) => ({ title: p.title, path: p.href })),
    }),
    breadcrumbLd(crumbs),
  );

  const children = category.children ?? [];

  return (
    <>
      <JsonLd data={structuredData} />

      <section className="grid-bg border-b border-border">
        <Container className="py-14 sm:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">
            {category.parent ? `${category.parent.name} · Section` : 'Category'}
          </p>
          <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-muted-foreground">{category.description}</p>
          <p className="mt-6 text-sm text-muted-foreground">
            {total} {total === 1 ? 'article' : 'articles'} published
          </p>

          {children.length > 0 ? (
            <nav aria-label="Sections" className="mt-7 flex flex-wrap gap-2">
              {children.map((child) => (
                <Link
                  key={child.slug}
                  href={`/${category.slug}/${child.slug}`}
                  className={buttonClass('outline', 'sm')}
                >
                  {child.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </Container>
      </section>

      <Container className="py-12">
        <AdSlot placement="AD_SLOT_HEADER" size="leaderboard" className="mb-10" />

        {posts.length === 0 ? (
          <div className="surface p-10 text-center">
            <h2 className="text-lg font-semibold">Nothing published here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This category is live but has no published articles yet. Check back shortly.
            </p>
          </div>
        ) : (
          // The server still renders this page's worth of cards; the client
          // appends what follows. On page 2 and beyond the reader keeps
          // scrolling from wherever they landed rather than being sent back to
          // the start of the list.
          <InfinitePosts
            key={current}
            initial={posts}
            hasMoreInitially={current < totalPages}
            categorySlug={category.slug}
            pageSize={PER_PAGE}
            fallbackHref={current < totalPages ? `${path}?page=${current + 1}` : undefined}
          />
        )}

        {/* Numbered pagination stays underneath. Infinite scroll is the way a
            person reads the page; these links are how a crawler walks it, and
            they are what `rel=prev/next` hangs off. */}
        {totalPages > 1 ? (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-between">
            {current > 1 ? (
              <Link
                href={current === 2 ? path : `${path}?page=${current - 1}`}
                className={buttonClass('outline', 'md')}
                rel="prev"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="text-sm text-muted-foreground">
              Page {current} of {totalPages}
            </p>
            {current < totalPages ? (
              <Link
                href={`${path}?page=${current + 1}`}
                className={buttonClass('outline', 'md')}
                rel="next"
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Container>
    </>
  );
}
