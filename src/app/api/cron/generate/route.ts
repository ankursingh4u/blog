import { runPipeline } from '@/pipeline/run';

/**
 * Deployment-time entry point for the daily run (Vercel Cron).
 *
 * Not used while everything is local — `npm run scheduler` covers that. Left
 * wired up so go-live is a vercel.json entry plus a CRON_SECRET, with no code
 * change.
 *
 * Auth: a bearer token matching CRON_SECRET, which is exactly what Vercel Cron
 * sends. With CRON_SECRET unset the route refuses everything rather than
 * defaulting open — an unauthenticated generation endpoint on a public host is
 * a way to burn an API budget.
 *
 * Vercel Cron issues a **GET**, so GET is the trigger. A GET with no valid
 * bearer (a browser, a crawler) returns status only and never starts a run.
 * POST is accepted too, for triggering by hand with curl.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Auth = { ok: true } | { ok: false; response: Response };

function authorise(request: Request): Auth {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      response: Response.json(
        { error: 'CRON_SECRET is not configured; this endpoint is disabled.' },
        { status: 503 },
      ),
    };
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true };
}

async function trigger(): Promise<Response> {
  try {
    const result = await runPipeline();
    return Response.json({
      ok: true,
      ingested: result.ingested,
      attempted: result.attempted,
      published: result.published,
      inReview: result.inReview,
      failed: result.failed,
      outcomes: result.outcomes,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Pipeline failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authenticated = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;

  // Unauthenticated GET is a health check, not a trigger.
  if (!authenticated) {
    return Response.json({
      ok: true,
      message: 'Send Authorization: Bearer <CRON_SECRET> to trigger a run.',
      configured: Boolean(secret),
    });
  }

  return trigger();
}

export async function POST(request: Request) {
  const auth = authorise(request);
  if (!auth.ok) return auth.response;
  return trigger();
}
