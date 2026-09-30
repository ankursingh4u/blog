import { applyStatus, archivePost } from '@/lib/admin/moderation';
import {
  TelegramUpdate,
  answerCallback,
  markResolved,
  parseCallbackData,
  telegramConfig,
} from '@/lib/telegram';

/**
 * Approve or reject a draft from Telegram.
 *
 * This endpoint publishes to a public website, so it is worth being explicit
 * about what stops a stranger using it. Three independent checks, all required:
 *
 *   1. `X-Telegram-Bot-Api-Secret-Token` must match TELEGRAM_WEBHOOK_SECRET.
 *      Telegram sends this on every call and nobody else knows it. This alone
 *      is what proves the request came from Telegram at all.
 *   2. The callback must originate in the configured chat. A bot's username is
 *      discoverable, so anyone can open their own chat with it and press
 *      buttons; without this check, their taps would publish your articles.
 *   3. The payload must parse as exactly `approve:<id>` or `reject:<id>`.
 *
 * With any of the three env vars unset the route is closed rather than open,
 * the same way /api/cron/generate refuses to run without CRON_SECRET.
 *
 * It always answers 200. Telegram retries non-2xx responses, and a retry storm
 * on a genuine bug would replay moderation decisions; the outcome is reported
 * in the chat instead.
 */

export const dynamic = 'force-dynamic';

function ok(body: Record<string, unknown> = {}) {
  return Response.json({ ok: true, ...body });
}

export async function POST(request: Request) {
  const config = telegramConfig();
  if (!config) {
    return Response.json(
      { ok: false, error: 'Telegram is not configured on this deployment.' },
      { status: 503 },
    );
  }

  if (request.headers.get('x-telegram-bot-api-secret-token') !== config.webhookSecret) {
    // 401 rather than a silent 200: this one is not Telegram retrying, it is
    // someone guessing, and it should look like a closed door.
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = TelegramUpdate.parse(await request.json());
  } catch {
    return ok({ ignored: 'unrecognised update shape' });
  }

  const query = update.callback_query;
  if (!query) return ok({ ignored: 'not a button press' });

  const fromChat = query.message?.chat.id;
  if (String(fromChat ?? '') !== config.chatId) {
    await answerCallback(query.id, 'Not authorised.');
    return ok({ ignored: 'callback from an unexpected chat' });
  }

  const parsed = parseCallbackData(query.data);
  if (!parsed) {
    await answerCallback(query.id, 'Nothing to do.');
    return ok({ ignored: 'unrecognised callback data' });
  }

  const result =
    parsed.action === 'approve'
      ? await applyStatus(parsed.postId, 'PUBLISHED')
      : await archivePost(parsed.postId, 'rejected from Telegram');

  await answerCallback(query.id, result.message);

  // Only retire the buttons when something actually happened. A failed publish
  // — no cover image, say — should stay actionable once the cause is fixed.
  if (result.ok && query.message) {
    await markResolved(
      query.message.chat.id,
      query.message.message_id,
      parsed.action === 'approve' ? '✅ Published' : '✕ Rejected',
    );
  }

  return ok({ action: parsed.action, postId: parsed.postId, result: result.message });
}

/** A browser hitting this should learn nothing beyond whether it is wired up. */
export async function GET() {
  return Response.json({
    ok: true,
    configured: telegramConfig() !== null,
    message: 'Telegram webhook endpoint. Telegram POSTs here.',
  });
}
