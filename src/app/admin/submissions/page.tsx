import Link from 'next/link';
import { Inbox } from 'lucide-react';

import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { SubmissionCard } from '@/components/admin/submission-card';

export const dynamic = 'force-dynamic';

const TABS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
type Tab = (typeof TABS)[number];

type Search = Promise<{ status?: string }>;

/**
 * The reader-submission queue.
 *
 * Nothing here has been read by anyone yet, so the body is rendered as plain
 * text — never as markdown or HTML. A submission is arbitrary text from a
 * stranger, and the admin is the one place where rendering it would do the most
 * damage.
 */
export default async function SubmissionsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const requested = String(params.status ?? 'PENDING').toUpperCase();
  const status: Tab = (TABS as readonly string[]).includes(requested) ? (requested as Tab) : 'PENDING';

  const [submissions, counts, categories] = await Promise.all([
    prisma.submission.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parent: { select: { name: true } } },
    }),
  ]);

  const countFor = (s: Tab) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Reader submissions</h2>
        <Link href="/write" className="text-sm text-muted-foreground underline hover:text-foreground">
          View the public form
        </Link>
      </div>

      <nav aria-label="Submission status" className="mt-5 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/submissions?status=${tab}`}
            aria-current={tab === status ? 'page' : undefined}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              tab === status
                ? 'border-brand bg-brand/10 font-medium text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {tab} ({countFor(tab)})
          </Link>
        ))}
      </nav>

      {submissions.length === 0 ? (
        <div className="surface mt-6 p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            {status === 'PENDING'
              ? 'Nothing waiting. Submissions from /write land here.'
              : `No ${status.toLowerCase()} submissions.`}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={{
                id: submission.id,
                title: submission.title,
                body: submission.body,
                authorName: submission.authorName,
                authorEmail: submission.authorEmail,
                images: submission.images,
                status: submission.status,
                note: submission.note,
                postId: submission.postId,
                suggestedCategoryId: submission.category?.id ?? null,
                suggestedCategoryName: submission.category?.name ?? null,
                createdAt: formatDate(submission.createdAt) ?? "",
              }}
              categories={categoryOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
