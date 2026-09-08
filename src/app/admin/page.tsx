import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, Inbox } from 'lucide-react';

import { prisma } from '@/lib/db';
import { asBool, asInt, getSettings } from '@/lib/settings';
import { hasApiKey } from '@/lib/ai';
import { formatDate } from '@/lib/utils';
import { Badge, buttonClass } from '@/components/ui/primitives';
import { RunPipelineButton } from '@/components/admin/run-pipeline-button';
import { StatusPill } from '@/components/admin/status-pill';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [counts, settings, queuedKeywords] = await Promise.all([
    prisma.post.groupBy({ by: ['status'], _count: { _all: true } }),
    getSettings(),
    prisma.keyword.count({ where: { status: 'QUEUED' } }),
  ]);

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);

  const reviewQueue = await prisma.post.findMany({
    where: { status: { in: ['REVIEW', 'DRAFT'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { category: true, author: true },
  });

  // Anything published today without a tested build still needs a human to run
  // the fix — this is the "Published today — verify" queue from the brief.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const verifyQueue = await prisma.post.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gte: startOfDay }, testedOnBuild: null },
    orderBy: { publishedAt: 'desc' },
    include: { category: true },
  });

  const autoPublish = asBool(settings.AUTO_PUBLISH);

  return (
    <div className="space-y-10">
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total posts" value={total} icon={<FileText className="h-4 w-4" />} />
          <Stat
            label="Published"
            value={byStatus.get('PUBLISHED') ?? 0}
            icon={<CheckCircle2 className="h-4 w-4 text-ok" />}
          />
          <Stat
            label="Awaiting review"
            value={(byStatus.get('REVIEW') ?? 0) + (byStatus.get('DRAFT') ?? 0)}
            icon={<AlertTriangle className="h-4 w-4 text-warn" />}
            href="/admin/posts?status=REVIEW"
          />
          <Stat
            label="Keywords queued"
            value={queuedKeywords}
            icon={<Inbox className="h-4 w-4" />}
            href="/admin/keywords"
          />
        </div>
      </section>

      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Daily run</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Ingests the feeds, then produces {asInt(settings.POSTS_PER_DAY, 2)} post
              {asInt(settings.POSTS_PER_DAY, 2) === 1 ? '' : 's'}.{' '}
              {autoPublish
                ? `Auto-publish is ON — anything scoring ${asInt(settings.QUALITY_THRESHOLD, 85)}+ with clean identifiers goes live immediately.`
                : 'Auto-publish is OFF — everything lands in review.'}
            </p>
          </div>
          <Badge tone={autoPublish ? 'warn' : 'neutral'}>
            AUTO_PUBLISH {autoPublish ? 'on' : 'off'}
          </Badge>
        </div>
        <div className="mt-5">
          <RunPipelineButton disabled={!hasApiKey()} />
        </div>
      </section>

      {verifyQueue.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Published today — verify</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live, but nobody has run the fix yet. Each one shows &ldquo;verification
            pending&rdquo; to readers until a tested build is recorded.
          </p>
          <ul className="surface mt-4 divide-y divide-border">
            {verifyQueue.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-brand">
                    {post.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {post.category.name} · published {formatDate(post.publishedAt)}
                  </p>
                </div>
                <Link href={`/admin/posts/${post.id}`} className={buttonClass('outline', 'sm')}>
                  Record tested build
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review queue</h2>
          <Link href="/admin/posts" className={buttonClass('ghost', 'sm')}>
            All posts
          </Link>
        </div>

        {reviewQueue.length === 0 ? (
          <p className="surface mt-4 p-6 text-sm text-muted-foreground">
            Nothing waiting. Run the pipeline to produce drafts.
          </p>
        ) : (
          <ul className="surface mt-4 divide-y divide-border">
            {reviewQueue.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-brand">
                    {post.title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusPill status={post.status} />
                    {post.category.name} · {post.author.name}
                    {post.qualityScore !== null ? (
                      <span
                        className={
                          post.qualityScore >= 85
                            ? 'text-ok'
                            : post.qualityScore >= 60
                              ? 'text-warn'
                              : 'text-danger'
                        }
                      >
                        score {post.qualityScore}
                      </span>
                    ) : null}
                    {post.qualityNotes?.startsWith('BLOCKED') ? (
                      <span className="text-danger">identifier check failed</span>
                    ) : null}
                  </p>
                </div>
                <Link href={`/admin/posts/${post.id}`} className={buttonClass('outline', 'sm')}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="surface p-5 transition-colors hover:border-brand/40">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
