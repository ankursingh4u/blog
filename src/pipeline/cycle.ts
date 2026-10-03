import { prisma } from '@/lib/db';
import { asInt, getSettings } from '@/lib/settings';
import { log } from '@/pipeline/log';
import { ingest } from '@/pipeline/ingest';
import { runPipeline, type PipelineOutcome } from '@/pipeline/run';
import {
  newCycle,
  readCycle,
  readReady,
  writeCycle,
  writeReady,
  type CycleEntry,
} from '@/lib/review-queue';
import { sendNextForReview } from '@/pipeline/review-flow';
import { fixedBylineFor } from '@/lib/bylines';

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
  /**
   * Drafts parked for the next slot instead of sent now. Only set when the
   * caller asked to prepare rather than deliver.
   */
  parked: number;
}

export async function runCycle(
  options: {
    perCategory?: number;
    skipIngest?: boolean;
    /**
     * Prepare only: write the batch, park it, send nothing.
     *
     * This is what the schedule asks for. The drafts wait in `READY_BATCH` and
     * the following tick opens them, which is what lets a forty-minute
     * generation sit inside a six-hour window instead of inside the five-minute
     * request that triggered it. See pipeline/release.ts.
     */
    park?: boolean;
  } = {},
): Promise<CycleResult> {
  const startedAt = new Date().toISOString();
  const settings = await getSettings();
  const perCategory = options.perCategory ?? asInt(settings.POSTS_PER_CATEGORY, 2);
  const park = options.park ?? false;

  const nothing = (ingested = 0): CycleResult => ({
    startedAt,
    finishedAt: new Date().toISOString(),
    ingested,
    produced: 0,
    perCategory: {},
    budgetStopped: false,
    outcomes: [],
    cycleOpened: false,
    parked: 0,
  });

  /**
   * One batch waiting is enough.
   *
   * Preparing on top of an unopened batch pays for two and can only ever show
   * one, so the second is money spent on drafts that go straight past the
   * reviewer. This is the guard that matters when preparing, and it replaces the
   * old "is a cycle open?" check: writing the next batch *while* the current one
   * is being reviewed is the entire point of the split.
   */
  if (park) {
    const ready = await readReady();
    if (ready) {
      log.warn(
        `cycle: ${ready.entries.length} draft(s) prepared at ${ready.preparedAt} are still ` +
          'waiting for a slot, so nothing new was written. They go out at the next tick.',
      );
      return nothing();
    }
  } else {
    const open = await readCycle();
    if (open && open.cursor < open.entries.length) {
      /**
       * Refuse to open a second cycle on top of an unfinished one.
       *
       * Opening a new cycle would overwrite the queue and silently abandon every
       * draft still waiting for a decision, paid for, written, and never seen.
       * Better to skip a cycle than to throw one away.
       *
       * This path is the immediate "do the rounds now" run, by hand. The
       * scheduled path parks instead, and a parked batch is appended to an open
       * queue rather than replacing it, so it has no need of this.
       */
      log.warn(
        `cycle: ${open.entries.length - open.cursor} draft(s) still awaiting review, ` +
          'skipping this cycle. Finish the queue in Telegram or /admin.',
      );
      return nothing();
    }
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

  /**
   * Bylines already used this cycle, carried from one category run to the next.
   *
   * Without it each run only avoids repeating its own previous author, and a
   * cycle of eight ended up with one name on two of them. A section with a
   * standing byline is unaffected: that person signs their section every time,
   * by design, and the spread applies to the rotating sections.
   */
  const usedAuthorIds: string[] = [];

  /**
   * How many drafts each section gets this cycle.
   *
   * CYCLE_PLAN is "slug:count" pairs; a section not named falls back to
   * POSTS_PER_CATEGORY, and one set to 0 is skipped. An unknown slug is logged
   * rather than ignored, because a typo would otherwise look exactly like the
   * plan working.
   */
  const plan = new Map<string, number>();
  for (const pair of (settings.CYCLE_PLAN ?? '').split(',')) {
    const [slug, count] = pair.split(':').map((part) => part.trim());
    if (!slug) continue;
    if (!categories.some((c) => c.slug === slug)) {
      log.warn(`cycle: CYCLE_PLAN names "${slug}", which is not a section. Ignored.`);
      continue;
    }
    plan.set(slug, asInt(count, perCategory));
  }

  for (const category of categories) {
    if (budgetStopped) break;

    const wanted = plan.get(category.slug) ?? perCategory;
    if (wanted <= 0) {
      log.info(`cycle: ${category.slug} is set to 0 in CYCLE_PLAN, skipped`);
      counts[category.slug] = 0;
      continue;
    }

    const others = categories.filter((c) => c.slug !== category.slug).map((c) => c.slug);
    const result = await runPipeline({
      skipIngest: true,
      limit: wanted,
      excludeCategorySlugs: others,
      usedAuthorIds: [...usedAuthorIds],
      // The queue sends these one at a time; sixteen messages at once is the
      // thing it exists to prevent.
      notify: false,
    });

    const produced = result.outcomes.filter((o) => o.status === 'REVIEW' && o.postId);
    if (produced.length > 0) {
      const written = await prisma.post.findMany({
        where: { id: { in: produced.map((o) => o.postId!) } },
        select: { authorId: true, category: { select: { slug: true } } },
      });
      for (const post of written) {
        // Standing bylines are meant to repeat, so they never enter the
        // used list; excluding them would push a section off its own author.
        if (!fixedBylineFor(post.category.slug)) usedAuthorIds.push(post.authorId);
      }
    }

    outcomes.push(...result.outcomes);
    counts[category.slug] = produced.length;
    if (result.budgetStopped) {
      budgetStopped = true;
      log.warn(`cycle: stopped at ${category.slug}, daily token cap reached.`);
    }
  }

  const entries = await entriesFor(outcomes);

  if (entries.length === 0) {
    log.warn('cycle: no drafts were produced, so no review cycle was opened.');
    return {
      ...nothing(ingested),
      perCategory: counts,
      budgetStopped,
      outcomes,
    };
  }

  /**
   * Prepared, not delivered. The next tick opens it.
   *
   * Deliberately silent: the point of a cooling window is that it happens
   * without anyone being told. The batch announces itself when it is shown.
   */
  if (park) {
    await writeReady(entries);
    log.info(
      `cycle: ${entries.length} draft(s) prepared across ${categories.length} sections ` +
        'and parked for the next slot.',
    );
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      ingested,
      produced: entries.length,
      perCategory: counts,
      budgetStopped,
      outcomes,
      cycleOpened: false,
      parked: entries.length,
    };
  }

  const cycle = newCycle(entries);
  await writeCycle(cycle);

  /*
   * The send is the point of the cycle, so its failure is reported, not
   * swallowed. A queue nobody is told about is a queue nobody answers.
   */
  const notified = await sendNextForReview();
  if (!notified) {
    log.error(
      'cycle: drafts are queued but Telegram would not take the first one. ' +
        'Check TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID; the queue is intact and /admin still works.',
    );
  }

  log.info(
    `cycle: ${entries.length} draft(s) queued across ${categories.length} sections` +
      `${notified ? ', first one sent to Telegram' : ', NOT sent to Telegram'}`,
  );

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    ingested,
    produced: entries.length,
    perCategory: counts,
    budgetStopped,
    outcomes,
    cycleOpened: true,
    parked: 0,
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
