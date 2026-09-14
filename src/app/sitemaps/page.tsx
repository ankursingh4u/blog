import type { Metadata } from 'next';
import Link from 'next/link';

import { Container, SectionHeading } from '@/components/ui/primitives';
import { prisma } from '@/lib/db';
import { buildMetadata } from '@/lib/seo';
import { categoryPath, postPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Sitemap',
  description: 'Every section, article and contributor on Favo News, on one page.',
  path: '/sitemaps',
});

/**
 * Built per request, like /sitemap.xml.
 *
 * An index of everything the site holds is only useful if it holds everything;
 * an hour-old copy quietly omits whatever was published in that hour, and the
 * omission is invisible.
 */
export const dynamic = 'force-dynamic';

/**
 * The readable sitemap.
 *
 * A companion to /sitemap.xml, not a replacement: the XML is what crawlers and
 * Search Console look for and keeps its conventional filename, while this is
 * for a person who wants to see everything the site holds without clicking
 * through eight sections. Both are generated from the same query, so they
 * cannot drift apart.
 */
export default async function SitemapPage() {
  const [categories, posts, authors] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        children: {
          orderBy: { position: 'asc' },
          select: { id: true, name: true, slug: true, parent: { select: { slug: true } } },
        },
      },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED', publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        categoryId: true,
        category: { select: { slug: true, parent: { select: { slug: true } } } },
      },
    }),
    // Same rule as the XML: a profile with nothing published is not worth a link.
    prisma.author.findMany({
      where: { posts: { some: { status: 'PUBLISHED', publishedAt: { not: null } } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, isGuest: true },
    }),
  ]);

  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    const bucket = byCategory.get(post.categoryId) ?? [];
    bucket.push(post);
    byCategory.set(post.categoryId, bucket);
  }

  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        eyebrow="Index"
        title="Sitemap"
        description={`Every section, all ${posts.length} published articles, and everyone who has written for us.`}
      />

      <div className="mt-8 space-y-10">
        {categories.map((category) => {
          const own = byCategory.get(category.id) ?? [];
          const childBlocks = category.children.map((child) => ({
            child,
            posts: byCategory.get(child.id) ?? [],
          }));
          const total = own.length + childBlocks.reduce((n, c) => n + c.posts.length, 0);

          return (
            <section key={category.id} className="surface p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                <Link href={categoryPath(category)} className="hover:text-brand">
                  {category.name}
                </Link>
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {total} {total === 1 ? 'article' : 'articles'}
                </span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>

              {own.length > 0 ? <ArticleList posts={own} /> : null}

              {childBlocks.map(({ child, posts: childPosts }) => (
                <div key={child.id} className="mt-6 border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">
                    <Link href={categoryPath(child)} className="hover:text-brand">
                      {category.name} › {child.name}
                    </Link>
                  </h3>
                  {childPosts.length > 0 ? (
                    <ArticleList posts={childPosts} />
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Nothing published here yet.</p>
                  )}
                </div>
              ))}

              {total === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing published here yet.</p>
              ) : null}
            </section>
          );
        })}

        <section className="surface p-6">
          <h2 className="text-lg font-semibold tracking-tight">Writers</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <li key={author.id}>
                <Link
                  href={`/author/${author.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {author.name}
                  {author.isGuest ? (
                    <span className="ml-1.5 text-xs text-brand">contributor</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-6">
          <h2 className="text-lg font-semibold tracking-tight">Pages</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/', label: 'Home' },
              { href: '/search', label: 'Search' },
              { href: '/saved', label: 'Saved articles' },
              { href: '/write', label: 'Write for us' },
              { href: '/briefing', label: 'Briefing' },
              { href: '/about', label: 'About' },
              { href: '/editorial-policy', label: 'Editorial policy' },
              { href: '/contact', label: 'Contact' },
            ].map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">
            Search engines want the machine-readable version:{' '}
            <a href="/sitemap.xml" className="underline hover:text-foreground">
              /sitemap.xml
            </a>
            . It carries the same pages, plus the article images and the date each was last
            updated.
          </p>
        </section>
      </div>
    </Container>
  );
}

function ArticleList({
  posts,
}: {
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    publishedAt: Date | null;
    category: { slug: string; parent: { slug: string } | null };
  }>;
}) {
  return (
    <ul className="mt-4 space-y-2">
      {posts.map((post) => (
        <li key={post.id} className="flex flex-wrap items-baseline gap-x-3">
          <Link href={postPath(post)} className="text-sm hover:text-brand">
            {post.title}
          </Link>
          <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
        </li>
      ))}
    </ul>
  );
}
