import { ingest } from '@/pipeline/ingest';
import { runPipeline } from '@/pipeline/run';

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

async function ingestAndGenerate(limit: number): Promise<Response> {
  const result = await runPipeline({ limit });
  return Response.json({
    ok: true,
    mode: 'generate',
    ingested: result.ingested,
    attempted: result.attempted,
    published: result.published,
    inReview: result.inReview,
    failed: result.failed,
    outcomes: result.outcomes,
  });
}

async function trigger(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const generate = url.searchParams.get('mode') === 'generate';

  try {
    if (!generate) return await ingestOnly();

    const asked = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
    const limit = Math.min(Number.isFinite(asked) && asked > 0 ? asked : 1, MAX_GENERATE);
    return await ingestAndGenerate(limit);
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
      default: 'ingest only; add ?mode=generate to write articles',
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
