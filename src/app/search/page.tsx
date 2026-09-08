import Link from 'next/link';
import type { Metadata } from 'next';
import { Search as SearchIcon } from 'lucide-react';

import { Container, buttonClass } from '@/components/ui/primitives';
import { InfinitePosts } from '@/components/infinite-posts';
import { getCategories, searchPosts } from '@/lib/posts';
import { buildMetadata } from '@/lib/seo';

// Results depend on the query string, so nothing here can be cached.
const PER_PAGE = 24;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Search',
  description: 'Search every article on the site, across all sections.',
  path: '/search',
  // Query-string result pages are thin and near-duplicate; keep them out of the
  // index but let the crawler follow through to the articles.
  noindex: true,
});

type Search = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();
  const [results, categories] = await Promise.all([
    query ? searchPosts(query, PER_PAGE) : Promise.resolve([]),
    getCategories(),
  ]);

  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Search</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Search by topic, or describe what you are trying to find out.
      </p>

      <form action="/search" method="get" role="search" className="mt-8 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Search guides
        </label>
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="0x800f0922, KB5044284, Outlook won't open…"
            autoComplete="off"
            className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand"
          />
        </div>
        <button type="submit" className={buttonClass('primary', 'lg')}>
          Search
        </button>
      </form>

      {query ? (
        <section className="mt-12" aria-live="polite">
          <h2 className="text-sm text-muted-foreground">
            {results.length === PER_PAGE ? `${results.length}+` : results.length}{' '}
            {results.length === 1 ? 'result' : 'results'} for{' '}
            <span className="font-medium text-foreground">“{query}”</span>
          </h2>
          {results.length > 0 ? (
            <div className="mt-6">
              <InfinitePosts
                // Remount when the query changes, so a new search replaces the
                // accumulated results instead of appending to them.
                key={query}
                initial={results}
                hasMoreInitially={results.length === PER_PAGE}
                searchQuery={query}
                pageSize={PER_PAGE}
              />
            </div>
          ) : (
            <div className="surface mt-6 p-8">
              <p className="text-sm text-muted-foreground">
                Nothing matched. Try fewer words, or browse a section below.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className="text-sm font-semibold">Browse by category</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link key={category.slug} href={`/${category.slug}`} className={buttonClass('outline', 'sm')}>
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}
