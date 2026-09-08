/**
 * `npm run scheduler` — the local stand-in for Vercel Cron.
 *
 * Runs once a day at 09:00 local time. Two modes:
 *
 *   `--ingest-only` (default)
 *       Polls Google News and fills the topic queue, then stops. This is pure
 *       RSS and HTTP: **no language model is called and nothing is billed.**
 *       Each morning the new stories are waiting under
 *       /admin/posts/new for a person to write up by hand.
 *
 *   `--generate`
 *       The original behaviour: also drafts POSTS_PER_DAY articles, spread a
 *       few hours apart so the feed reads like a person working through a
 *       queue. This is the mode that costs money, so it is opt-in rather than
 *       the default.
 *
 * At go-live this process is replaced by a Vercel Cron entry hitting
 * /api/cron/generate — see vercel.json.
 */
import { config } from 'dotenv';
import cron from 'node-cron';
import { runPipeline } from '../src/pipeline/run';
import { ingest } from '../src/pipeline/ingest';
import { prisma } from '../src/lib/db';
import { asInt, getSettings } from '../src/lib/settings';

config();

const DAILY_AT_9AM = '0 9 * * *';
const SPREAD_HOURS = 3;

// Generation is opt-in. Defaulting to ingest-only means an unattended scheduler
// cannot quietly run up a bill.
const GENERATE = process.argv.includes('--generate');

let running = false;

async function runSpread() {
  if (running) {
    console.warn('[scheduler] previous run still in progress — skipping this trigger');
    return;
  }
  running = true;

  try {
    if (!GENERATE) {
      const result = await ingest();
      console.info(
        `[scheduler] ingest: ${result.itemsSeen} items → ${result.inserted} new topic(s). ` +
          'Write them up at /admin/posts/new. No generation, no cost.',
      );
      return;
    }

    const settings = await getSettings();
    const total = Math.min(asInt(settings.POSTS_PER_DAY, 2), 3);

    console.info(`[scheduler] starting: ${total} post(s), ~${SPREAD_HOURS}h apart`);

    for (let i = 0; i < total; i += 1) {
      if (i > 0) {
        const waitMs = SPREAD_HOURS * 60 * 60 * 1000;
        console.info(`[scheduler] waiting ${SPREAD_HOURS}h before post ${i + 1}/${total}…`);
        await sleep(waitMs);
      }
      // Ingest only on the first pass; the queue is already fresh after that.
      const result = await runPipeline({ limit: 1, skipIngest: i > 0 });
      console.info(
        `[scheduler] post ${i + 1}/${total}: ${result.published} published, ${result.inReview} in review, ${result.failed} failed`,
      );
    }

    console.info('[scheduler] day complete');
  } catch (error) {
    console.error('[scheduler] run failed:', error);
  } finally {
    running = false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const task = cron.schedule(DAILY_AT_9AM, runSpread, { scheduled: true });

console.info(`[scheduler] started — daily at 09:00 local time (cron "${DAILY_AT_9AM}")`);
console.info(
  GENERATE
    ? '[scheduler] mode: ingest + generate — this calls the API and costs money'
    : '[scheduler] mode: ingest only — free. Pass --generate to also draft articles.',
);
console.info('[scheduler] press Ctrl+C to stop, or run `npm run generate` for a one-off run');

if (process.argv.includes('--now')) {
  console.info('[scheduler] --now supplied; running immediately as well');
  void runSpread();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.info(`\n[scheduler] ${signal} — shutting down`);
    task.stop();
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}
