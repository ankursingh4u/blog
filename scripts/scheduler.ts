/**
 * `npm run scheduler` — the local stand-in for Vercel Cron.
 *
 * Runs once a day at 09:00 local time and spreads POSTS_PER_DAY posts a few
 * hours apart rather than publishing them in one burst, so the feed reads like
 * a person working through a queue.
 *
 * At go-live this process is replaced by a Vercel Cron entry hitting
 * /api/cron/generate — see vercel.json. Nothing else changes.
 */
import { config } from 'dotenv';
import cron from 'node-cron';
import { runPipeline } from '../src/pipeline/run';
import { prisma } from '../src/lib/db';
import { asInt, getSettings } from '../src/lib/settings';

config();

const DAILY_AT_9AM = '0 9 * * *';
const SPREAD_HOURS = 3;

let running = false;

async function runSpread() {
  if (running) {
    console.warn('[scheduler] previous run still in progress — skipping this trigger');
    return;
  }
  running = true;

  try {
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
