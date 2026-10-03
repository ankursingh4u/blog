import { prisma } from '@/lib/db';
import { setSetting } from '@/lib/settings';
import { log } from '@/pipeline/log';
import { runCycle } from '@/pipeline/cycle';
import { sendNextForReview } from '@/pipeline/review-flow';
import {
  clearReady,
  isComplete,
  newCycle,
  readCycle,
  readReady,
  writeCycle,
} from '@/lib/review-queue';

/**
 * The two halves of a scheduled tick: deliver what is ready, start the next lot.
 *
 * Generating a cycle takes about forty minutes. The scheduler that triggers it
 * is killed after five. Every scheduled run between 1 and 3 October failed for
 * exactly that reason, and whether any articles appeared came down to whether
 * the orphaned request happened to outlive the process that started it.
 *
 * So the tick no longer *is* the work:
 *
 *   t+0h    release the batch prepared last time   (one Telegram call, instant)
 *           start preparing the next one           (detached, ~40 min)
 *   t+0-6h  cooling: generation finishes, drafts park, nobody is waiting
 *   t+6h    release that batch, start the next
 *
 * Approval is unchanged and still immediate: a tap in Telegram publishes the
 * article there and then. Only the writing moved off the critical path.
 */

/** How long a preparation may be in flight before a new tick assumes it died. */
const PREPARE_STALE_MINUTES = 90;

export interface TickResult {
  /** Drafts handed to the review queue by this tick. */
  released: number;
  /** How they were delivered, or why they were not. */
  delivery: 'opened' | 'appended' | 'nothing-ready';
  /** False when a preparation was already in flight, or a batch already waits. */
  preparing: boolean;
  note?: string;
}

/**
 * Opens the parked batch, or adds it to the queue already in progress.
 *
 * Appending rather than replacing is the whole safety property here. A tick
 * arrives every six hours whether or not the last batch was finished, and
 * overwriting the queue would silently bin drafts that were paid for, written,
 * and never seen. Appended drafts join the back and arrive in turn, with no
 * second message: somebody is already looking at one, and the queue moves on a
 * decision.
 */
export async function releaseReadyBatch(): Promise<{
  released: number;
  delivery: TickResult['delivery'];
}> {
  const ready = await readReady();
  if (!ready) return { released: 0, delivery: 'nothing-ready' };

  const open = await readCycle();

  if (open && !isComplete(open)) {
    await writeCycle({ ...open, entries: [...open.entries, ...ready.entries] });
    await clearReady();
    log.info(
      `release: ${ready.entries.length} draft(s) added to the queue in progress, ` +
        `${open.entries.length - open.cursor} still undecided ahead of them.`,
    );
    return { released: ready.entries.length, delivery: 'appended' };
  }

  await writeCycle(newCycle(ready.entries));
  await clearReady();

  /*
   * Reported, not swallowed. A queue nobody is told about is a queue nobody
   * answers, and the whole point of a timed release is that it is noticed.
   */
  const notified = await sendNextForReview();
  if (!notified) {
    log.error(
      'release: the batch is queued but Telegram would not take the first draft. ' +
        'Check TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID; the queue is intact and /admin still works.',
    );
  }

  log.info(
    `release: ${ready.entries.length} draft(s) opened for review` +
      `${notified ? ', first one sent to Telegram' : ', NOT sent to Telegram'}`,
  );
  return { released: ready.entries.length, delivery: 'opened' };
}

/**
 * Read straight from the table, past `getSettings`.
 *
 * `getSettings` is wrapped in React's `cache` and dedupes for the life of a
 * request. The tick writes the lock and then the detached work reads it back;
 * through the cache that read returns the pre-write value and the guard is no
 * guard at all. Same reasoning as `readCycle`.
 */
async function preparingSince(): Promise<Date | null> {
  const row = await prisma.setting.findUnique({ where: { key: 'PREPARING_SINCE' } });
  if (!row?.value) return null;
  const at = new Date(row.value);
  return Number.isNaN(at.getTime()) ? null : at;
}

/**
 * Writes the next batch, in the background, holding a lock while it does.
 *
 * The lock is a timestamp rather than a flag because this work is killed from
 * time to time: the container restarts, or the host runs out of memory
 * mid-article. A flag set by a process that then dies is a flag nobody ever
 * clears, and the schedule would stop forever with no error anywhere. A
 * timestamp older than `PREPARE_STALE_MINUTES` is simply ignored.
 */
export async function prepareNextBatch(): Promise<{ started: boolean; note?: string }> {
  const since = await preparingSince();
  if (since) {
    const minutes = (Date.now() - since.getTime()) / 60_000;
    if (minutes < PREPARE_STALE_MINUTES) {
      const note = `a preparation started ${Math.round(minutes)} min ago is still running`;
      log.warn(`prepare: ${note}, not starting another.`);
      return { started: false, note };
    }
    log.warn(
      `prepare: the preparation started ${Math.round(minutes)} min ago never finished, ` +
        'treating it as lost and starting a new one.',
    );
  }

  await setSetting('PREPARING_SINCE', new Date().toISOString());
  try {
    const result = await runCycle({ park: true });
    log.info(
      `prepare: finished, ${result.parked} draft(s) parked for the next slot ` +
        `(${result.produced} produced, budget ${result.budgetStopped ? 'stopped it' : 'ok'}).`,
    );
    return { started: true };
  } finally {
    // Released even when generation throws, or one bad batch wedges the
    // schedule until somebody notices and clears the row by hand.
    await setSetting('PREPARING_SINCE', '').catch(() =>
      log.error('prepare: could not clear the lock; the next tick will treat it as stale.'),
    );
  }
}

/**
 * One scheduled tick. Returns as soon as the delivery is done.
 *
 * Preparation is started and deliberately not awaited. This container is a
 * long-lived Node process, so the promise outlives the response; the same
 * pattern already drives regeneration in review-flow.ts. What it buys is a
 * caller that finishes in under a second, which is the difference between a
 * scheduled job that reports success and one the scheduler kills at five
 * minutes and marks failed.
 */
export async function tick(): Promise<TickResult> {
  const { released, delivery } = await releaseReadyBatch();

  const since = await preparingSince();
  const busy = since && (Date.now() - since.getTime()) / 60_000 < PREPARE_STALE_MINUTES;
  if (busy) {
    return {
      released,
      delivery,
      preparing: false,
      note: 'a preparation from an earlier tick is still running',
    };
  }

  void prepareNextBatch().catch((error) =>
    log.error(`prepare: failed, ${error instanceof Error ? error.message : error}`),
  );

  return { released, delivery, preparing: true };
}
