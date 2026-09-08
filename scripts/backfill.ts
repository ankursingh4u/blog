import 'dotenv/config';
import { prisma } from '@/lib/db';
import { runPipeline } from '@/pipeline/run';

/**
 * One-off backfill: keep running the pipeline until the site holds `--target`
 * articles.
 *
 * A single run is capped at three posts (`run.ts`), which is the right ceiling
 * for the daily scheduled job — it is what stops a cron misfire publishing
 * forty pages. Rather than weaken that cap, this loops it. The per-run limit,
 * the category spread and every quality gate behave exactly as they do on a
 * normal day; there are simply more runs.
 *
 * Stops early when the keyword queue stops yielding. Most trending keywords
 * have no citable source and are skipped before costing a generation call, so
 * "no progress" is a normal end state rather than an error — it means the queue
 * needs re-ingesting, not that something broke.
 *
 *   npx tsx scripts/backfill.ts --target=100
 *   npx tsx scripts/backfill.ts --target=100 --ingest   (re-poll feeds first)
 */
const PER_RUN = 3;
/** Consecutive runs that produce nothing before we conclude the queue is dry. */
const MAX_BARREN_RUNS = 4;

function arg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function main() {
  const target = arg('target', 100);
  const ingestFirst = process.argv.includes('--ingest');

  const startedWith = await prisma.post.count();
  console.log(`starting at ${startedWith} post(s); target ${target}`);

  let barren = 0;
  let runs = 0;
  const began = Date.now();

  for (;;) {
    const total = await prisma.post.count();
    if (total >= target) {
      console.log(`\nreached ${total} post(s).`);
      break;
    }
    if (barren >= MAX_BARREN_RUNS) {
      console.log(
        `\nstopping at ${total} post(s): ${MAX_BARREN_RUNS} runs in a row produced nothing. ` +
          'The keyword queue is exhausted of sourceable topics — re-run with --ingest.',
      );
      break;
    }

    runs += 1;

    // Hold back any section that has already had its share. Without this the
    // Windows back-catalogue takes most of the run: its keywords are backed by
    // Microsoft's own documentation and nearly always find a source, while the
    // general verticals succeed roughly a third of the time.
    const perCategory = await prisma.post.groupBy({
      by: ['categoryId'],
      _count: { _all: true },
    });
    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const slugById = new Map(categories.map((c) => [c.id, c.slug]));
    const quota = Math.ceil(target / categories.length);

    const atQuota = perCategory
      .filter((row) => row._count._all >= quota)
      .map((row) => (row.categoryId ? slugById.get(row.categoryId) : undefined))
      .filter((slug): slug is string => Boolean(slug));

    // If every section is full but the target is not met, stop excluding —
    // better to finish the count than stall on a quota that cannot be met.
    const exclude = atQuota.length < categories.length ? atQuota : [];

    // Ingest once at the start if asked; polling the feeds every run would just
    // re-fetch the same headlines and waste requests.
    const result = await runPipeline({
      limit: PER_RUN,
      skipIngest: !(ingestFirst && runs === 1),
      excludeCategorySlugs: exclude,
    });
    const made = result.published + result.inReview;
    barren = made === 0 ? barren + 1 : 0;

    const now = await prisma.post.count();
    const mins = (Date.now() - began) / 60000;
    const rate = (now - startedWith) / Math.max(mins, 0.01);
    const remaining = target - now;
    const eta = rate > 0 ? `${Math.round(remaining / rate)} min` : 'unknown';

    console.log(
      `run ${runs}: +${made} (${result.attempted} attempted, ${result.failed} skipped) → ` +
        `${now}/${target} · ${mins.toFixed(1)} min elapsed · ETA ${eta}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
