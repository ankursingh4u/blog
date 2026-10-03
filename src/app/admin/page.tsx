import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, Inbox } from 'lucide-react';

import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/utils';
import { buttonClass } from '@/components/ui/primitives';
import { StatusPill } from '@/components/admin/status-pill';
import { ReviewActions } from '@/components/admin/review-actions';
import { LastRun, type StoredRun } from '@/components/admin/last-run';
import { AutoRefresh } from '@/components/admin/auto-refresh';
import { readBudget, readTodayUsage } from '@/pipeline/budget';
import { readReady } from '@/lib/review-queue';

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

  /**
   * Troubleshooting guides published today that nobody has run yet.
   *
   * "Tested build" means a person followed the fix on that Windows build and it
   * worked. It is the one claim on this site that cannot be made by reading a
   * source, which is why it needs a queue.
   *
   * It only applies to the /tech/windows back-catalogue. Before this filter the
   * queue listed every article published today and offered "Record tested
   * build" against a cricket result and a credit-card story, under a heading
   * saying nobody had run the fix yet. There is no fix in a sports report. A
   * leftover from the Windows-only era, like the section-byline line on the
   * author pages.
   */
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const verifyQueue = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { gte: startOfDay },
      testedOnBuild: null,
      OR: [{ category: { slug: 'windows' } }, { category: { parent: { slug: 'windows' } } }],
    },
    orderBy: { publishedAt: 'desc' },
    include: { category: true },
  });

  // Persisted by runPipeline. A scheduled run leaves nothing on screen, so this
  // is the only record of what happened overnight.
  const [usage, budget] = await Promise.all([readTodayUsage(), readBudget()]);
  let lastRun: StoredRun | null = null;
  try {
    lastRun = settings.LAST_RUN ? (JSON.parse(settings.LAST_RUN) as StoredRun) : null;
  } catch {
    lastRun = null;
  }

  // Preparing and delivering run on separate clocks, so between ticks the only
  // evidence the pipeline is alive is a parked batch or a held lock.
  const ready = await readReady();
  const schedule = {
    parked: ready?.entries.length ?? 0,
    preparedAt: ready?.preparedAt ?? null,
    preparingSince: settings.PREPARING_SINCE || null,
  };

  return (
    <div className="space-y-10">
      {/* Decisions arrive from a Telegram group, so an open dashboard has to
          keep up with a phone. See the component for why this is polling. */}
      <AutoRefresh seconds={20} />
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

      {/*
        The "Daily run" card is gone.

        It described the pipeline as producing POSTS_PER_DAY articles, which
        stopped being true when CYCLE_PLAN arrived: the schedule now writes
        three each for sports, tech and money and one for everywhere else. A
        panel that states the wrong number is worse than no panel, and the
        schedule itself is the thing that runs, not a button on a dashboard.
      */}
      <LastRun
        run={lastRun}
        usage={usage}
        budget={budget}
        prices={settings.AI_TOKEN_PRICES}
        schedule={schedule}
      />

      {verifyQueue.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Fix-it guides published today, verify</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live, but nobody has run the fix yet. Each one shows &ldquo;verification
            pending&rdquo; to readers until a tested build is recorded. Troubleshooting
            guides only, there is nothing to test on a news report.
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
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/admin/posts/${post.id}`} className={buttonClass('outline', 'sm')}>
                    Open
                  </Link>
                  <ReviewActions id={post.id} title={post.title} />
                </div>
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
