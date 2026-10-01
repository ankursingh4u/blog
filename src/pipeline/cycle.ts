import { prisma } from '@/lib/db';
import { asInt, getSettings } from '@/lib/settings';
import { log } from '@/pipeline/log';
import { ingest } from '@/pipeline/ingest';
import { runPipeline, type PipelineOutcome } from '@/pipeline/run';
import {
  newCycle,
  readCycle,
  writeCycle,
  type CycleEntry,
} from '@/lib/review-queue';
import { sendNextForReview } from '@/pipeline/review-flow';

/**
 * A cycle: every vertical covered once, then handed to the review queue.
 *
 * Runs on a schedule (four times a day by default) and asks each top-level
 * category for POSTS_PER_CATEGORY drafts. The alternative, one run told to
 * produce sixteen, would let the sections that source most easily take the
 * whole quota, which is exactly how this site ended up as a Windows blog with
 * seven empty verticals.
 *
 * Each category is a separate `runPipeline` call with every other category
 * excluded. That reuses the selection, budget and author rules as they are
 * rather than adding a second way to pick keywords, at the cost of a little
 * repetition per call.
 *
 * Ingest happens once at the top. Running it per category would hammer the
 * feeds eight times for the same handful of new headlines.
 */

export interface CycleResult {
  startedAt: string;
  finishedAt: string;
  ingested: number;
  /** Drafts produced, across all categories. */
  produced: number;
  perCategory: Record<string, number>;
  budgetStopped: boolean;
  outcomes: PipelineOutcome[];
  /** False when nothing was produced, so no cycle was opened. */
  cycleOpened: boolean;
}

export async function runCycle(
  options: { perCategory?: number; skipIngest?: boolean } = {},
): Promise<CycleResult> {
  const startedAt = new Date().toISOString();
  const settings = await getSettings();
  const perCategory = options.perCategory ?? asInt(settings.POSTS_PER_CATEGORY, 2);

  const open = await readCycle();
  if (open && open.cursor < open.entries.length) {
    /**
     * Refuse to start a second cycle on top of an unfinished one.
     *
     * Opening a new cycle would overwrite the queue and silently abandon every
     * draft still waiting for a decision, paid for, written, and never seen.
     * Better to skip a cycle than to throw one away.
     */
    log.warn(
      `cycle: ${open.entries.length - open.cursor} draft(s) still awaiting review, ` +
        'skipping this cycle. Finish the queue in Telegram or /admin.',
    );
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      ingested: 0,
      produced: 0,
      perCategory: {},
      budgetStopped: false,
      outcomes: [],
      cycleOpened: false,
    };
  }

  let ingested = 0;
  if (!options.skipIngest) {
    const result = await ingest();
    ingested = result.inserted;
  }

  // Top-level verticals only. A child section (/tech/windows) shares its
  // parent's slot rather than claiming a quota of its own.
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: 'asc' },
    select: { slug: true, name: true },
  });

  const outcomes: PipelineOutcome[] = [];
  const counts: Record<string, number> = {};
  let budgetStopped = false;

  for (const category of categories) {
    if (budgetStopped) break;

    const others = categories.filter((c) => c.slug !== category.slug).map((c) => c.slug);
    const result = await runPipeline({
      skipIngest: true,
      limit: perCategory,
      excludeCategorySlugs: others,
      // The queue sends these one at a time; sixteen messages at once is the
      // thing it exists to prevent.
      notify: false,
    });

    outcomes.push(...result.outcomes);
    counts[category.slug] = result.outcomes.filter((o) => o.status === 'REVIEW').length;
    if (result.budgetStopped) {
      budgetStopped = true;
      log.warn(`cycle: stopped at ${category.slug}, daily token cap reached.`);
    }
  }

  const entries = await entriesFor(outcomes);

  if (entries.length === 0) {
    log.warn('cycle: no drafts were produced, so no review cycle was opened.');
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      ingested,
      produced: 0,
      perCategory: counts,
      budgetStopped,
      outcomes,
      cycleOpened: false,
    };
  }

  const cycle = newCycle(entries);
  await writeCycle(cycle);
  await sendNextForReview();

  log.info(`cycle: ${entries.length} draft(s) queued for review across ${categories.length} sections`);

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    ingested,
    produced: entries.length,
    perCategory: counts,
    budgetStopped,
    outcomes,
    cycleOpened: true,
  };
}

/**
 * Turns pipeline outcomes into queue entries.
 *
 * Only drafts in review: an auto-published article has nothing left to decide,
 * and a failed keyword has no post. The category comes from the database rather
 * than from the loop variable because the pipeline, not the caller, decides
 * which section a keyword really belongs to.
 */
async function entriesFor(outcomes: PipelineOutcome[]): Promise<CycleEntry[]> {
  const ids = outcomes.filter((o) => o.status === 'REVIEW' && o.postId).map((o) => o.postId!);
  if (ids.length === 0) return [];

  const posts = await prisma.post.findMany({
    where: { id: { in: ids }, status: 'REVIEW' },
    select: { id: true, title: true, category: { select: { slug: true, name: true } } },
  });

  return posts.map((post) => ({
    postId: post.id,
    categorySlug: post.category.slug,
    categoryName: post.category.name,
    title: post.title,
  }));
}
