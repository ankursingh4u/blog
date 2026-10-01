import { prisma } from '@/lib/db';
import { ingest } from '@/pipeline/ingest';
import { runPipeline } from '@/pipeline/run';
import { runCycle } from '@/pipeline/cycle';
import {
  pingAllPublished,
  refreshSeoFields,
  regradeAllFailed,
  seedHouseBylines,
} from '@/pipeline/backfill';

/**
 * The scheduled entry point, hit by Coolify's cron (and Vercel Cron if the site
 * ever moves back).
 *
 * **This route ingests by default and does not write articles.** That split is
 * deliberate and it is the whole point of the endpoint. Discovery is free — it
 * reads Google News RSS and autocomplete — whereas generation costs real OpenAI
 * credits per article. An unattended daily job that silently spends money is not
 * something you can supervise, so the schedule fills the keyword queue and a
 * human decides what is worth writing from /admin.
 *
 * Generation is still reachable, but only when asked for by name:
 *
 *   GET  /api/cron/generate            -> ingest only   (what the schedule calls)
 *   GET  /api/cron/generate?mode=generate&limit=2  -> ingest + write up to 2
 *   ...&only=entertainment,travel                  -> aim those articles at
 *                                                     named verticals only
 *
 * Auth is a bearer token matching CRON_SECRET. With CRON_SECRET unset the route
 * refuses to do anything rather than defaulting open — an unauthenticated
 * generation endpoint on a public host is a way to burn an API budget.
 *
 * Cron issues a GET, so GET is the trigger. A GET with no valid bearer (a
 * browser, a crawler) returns status only and never starts a run.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Hard ceiling on articles per call, whatever the caller asks for. */
const MAX_GENERATE = 3;

function isAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function ingestOnly(): Promise<Response> {
  const result = await ingest();
  return Response.json({
    ok: true,
    mode: 'ingest',
    spent: 'nothing — discovery only, no model calls',
    feedsRead: result.feedsRead,
    feedsFailed: result.feedsFailed,
    itemsSeen: result.itemsSeen,
    candidates: result.candidates,
    inserted: result.inserted,
    bySource: result.bySource,
  });
}

/**
 * Turns `?only=entertainment,travel` into the exclusion list the pipeline takes.
 *
 * The pipeline works in exclusions because its normal job is "spread across
 * everything, holding back whatever is already full". Filling a specific thin
 * vertical is the inverse and wants naming the ones you want, so the conversion
 * happens here rather than making callers list the seven they do not.
 *
 * An unrecognised slug is reported rather than silently ignored: asking for
 * `entertaiment` and getting a normal spread looks like the filter working.
 */
async function exclusionsFor(only: string | null): Promise<{
  exclude: string[];
  unknown: string[];
}> {
  if (!only?.trim()) return { exclude: [], unknown: [] };

  const wanted = new Set(
    only
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  );
  const categories = await prisma.category.findMany({ select: { slug: true } });
  const known = new Set(categories.map((category) => category.slug));

  return {
    exclude: categories.map((c) => c.slug).filter((slug) => !wanted.has(slug)),
    unknown: [...wanted].filter((slug) => !known.has(slug)),
  };
}

async function ingestAndGenerate(limit: number, only: string | null): Promise<Response> {
  const { exclude, unknown } = await exclusionsFor(only);
  if (unknown.length > 0) {
    return Response.json(
      { ok: false, error: `Unknown category slug(s): ${unknown.join(', ')}` },
      { status: 400 },
    );
  }

  const result = await runPipeline({ limit, excludeCategorySlugs: exclude });
  return Response.json({
    ok: true,
    mode: 'generate',
    only: only ?? 'all categories',
    ingested: result.ingested,
    attempted: result.attempted,
    published: result.published,
    inReview: result.inReview,
    failed: result.failed,
    budgetStopped: result.budgetStopped,
    outcomes: result.outcomes,
  });
}

/**
 * A cycle: every vertical covered, then handed to the one-at-a-time queue.
 *
 * This is the scheduled mode. `?mode=generate` stays what it was — a small,
 * aimed run that pushes each draft straight to Telegram — because "fill this
 * one thin section now" and "do the rounds" are different jobs.
 */
async function runFullCycle(url: URL): Promise<Response> {
  const asked = Number.parseInt(url.searchParams.get('perCategory') ?? '', 10);
  const result = await runCycle(
    Number.isFinite(asked) && asked > 0 ? { perCategory: Math.min(asked, MAX_GENERATE) } : {},
  );
  return Response.json({
    ok: true,
    mode: 'cycle',
    ingested: result.ingested,
    produced: result.produced,
    perCategory: result.perCategory,
    budgetStopped: result.budgetStopped,
    cycleOpened: result.cycleOpened,
    outcomes: result.outcomes,
  });
}

/**
 * The one-off repairs over the existing catalogue. See pipeline/backfill.ts.
 *
 * Here rather than behind a button: these are operations, not editorial
 * decisions, and two of them cost model calls, so they should be deliberate
 * rather than one mis-click away.
 */
const BACKFILLS = {
  'ping-all': pingAllPublished,
  'regrade-all': regradeAllFailed,
  'refresh-seo': refreshSeoFields,
  'seed-authors': seedHouseBylines,
} as const;

type BackfillName = keyof typeof BACKFILLS;

function isBackfill(value: string | null): value is BackfillName {
  return value !== null && value in BACKFILLS;
}

async function trigger(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const generate = mode === 'generate';

  try {
    if (isBackfill(mode)) {
      const result = await BACKFILLS[mode]();
      return Response.json({ ok: true, mode, ...result });
    }
    if (mode === 'cycle') return await runFullCycle(url);
    if (!generate) return await ingestOnly();

    const asked = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
    const limit = Math.min(Number.isFinite(asked) && asked > 0 ? asked : 1, MAX_GENERATE);
    return await ingestAndGenerate(limit, url.searchParams.get('only'));
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Pipeline failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    // Unauthenticated GET is a health check, not a trigger.
    return Response.json({
      ok: true,
      message: 'Send Authorization: Bearer <CRON_SECRET> to trigger a run.',
      configured: Boolean(process.env.CRON_SECRET?.trim()),
      default: 'ingest only; ?mode=generate writes articles, ?mode=cycle does the rounds',
    });
  }
  return trigger(request);
}

export async function POST(request: Request) {
  if (!isAuthorised(request)) {
    const configured = Boolean(process.env.CRON_SECRET?.trim());
    return Response.json(
      { error: configured ? 'Unauthorized' : 'CRON_SECRET is not configured; this endpoint is disabled.' },
      { status: configured ? 401 : 503 },
    );
  }
  return trigger(request);
}
