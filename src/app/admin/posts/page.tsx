import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { buttonClass } from '@/components/ui/primitives';
import { StatusPill } from '@/components/admin/status-pill';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUSES = ['ALL', 'REVIEW', 'DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const;
const PER_PAGE = 25;

type Search = Promise<{ status?: string; category?: string; q?: string; page?: string }>;

export default async function AdminPostsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const status = (params.status ?? 'ALL').toUpperCase();
  const categorySlug = params.category ?? '';
  const query = (params.q ?? '').trim();
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const where: Prisma.PostWhereInput = {
    ...(status !== 'ALL' && STATUSES.includes(status as (typeof STATUSES)[number])
      ? { status: status as Exclude<(typeof STATUSES)[number], 'ALL'> }
      : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(query
      ? { OR: [{ title: { contains: query } }, { slug: { contains: query } }] }
      : {}),
  };

  const [posts, total, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true, author: true },
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({ orderBy: { position: 'asc' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (overrides: Record<string, string>) => {
    const next = new URLSearchParams();
    if (status !== 'ALL') next.set('status', status);
    if (categorySlug) next.set('category', categorySlug);
    if (query) next.set('q', query);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    return `/admin/posts${qs ? `?${qs}` : ''}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {total} post{total === 1 ? '' : 's'}
        </h2>
        <Link href="/admin/posts/new" className={buttonClass('primary', 'md')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New article
        </Link>
      </div>

      <form method="get" action="/admin/posts" className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-xs text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-xs text-muted-foreground">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={categorySlug}
            className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="block text-xs text-muted-foreground">
            Title or slug
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        <button type="submit" className={buttonClass('outline', 'md')}>
          Filter
        </button>
        {status !== 'ALL' || categorySlug || query ? (
          <Link href="/admin/posts" className={buttonClass('ghost', 'md')}>
            Clear
          </Link>
        ) : null}
      </form>

      {posts.length === 0 ? (
        <p className="surface mt-6 p-8 text-center text-sm text-muted-foreground">
          No posts match those filters.
        </p>
      ) : (
        <div className="surface mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 font-medium">Author</th>
                <th scope="col" className="px-4 py-3 font-medium">Score</th>
                <th scope="col" className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-brand">
                      {post.title}
                    </Link>
                    {post.qualityNotes?.startsWith('BLOCKED') ? (
                      <span className="ml-2 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] uppercase text-danger">
                        blocked
                      </span>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      /{post.category.slug}/{post.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{post.category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{post.author.name}</td>
                  <td
                    className={cn(
                      'px-4 py-3 tabular-nums',
                      post.qualityScore === null
                        ? 'text-muted-foreground'
                        : post.qualityScore >= 85
                          ? 'text-ok'
                          : post.qualityScore >= 60
                            ? 'text-warn'
                            : 'text-danger',
                    )}
                  >
                    {post.qualityScore ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(post.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={buildHref({ page: String(page - 1) })} className={buttonClass('outline', 'sm')}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildHref({ page: String(page + 1) })} className={buttonClass('outline', 'sm')}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
