import { applyStatus, archivePost } from '@/lib/admin/moderation';
import { decidedOutcome, recordReviewDecision, swapCoverPhoto } from '@/pipeline/review-flow';
import { rememberChat } from '@/pipeline/backfill';
import {
  TelegramUpdate,
  answerCallback,
  escapeMarkdown,
  markResolved,
  parseCallbackData,
  replacePhoto,
  sendNotice,
  telegramConfig,
} from '@/lib/telegram';
import { absoluteUrl } from '@/lib/site';

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

  /*
   * A plain message only ever teaches us a chat id, which is what moving review
   * into a group needs. Recorded, never acted on: the chat allowed to approve
   * articles is still only TELEGRAM_CHAT_ID, checked below.
   */
  if (update.message?.chat) {
    const { id, type, title, username } = update.message.chat;
    await rememberChat({ id: String(id), type, title: title ?? username }).catch(() => undefined);
    return ok({ noted: 'chat recorded', chatId: String(id) });
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

  /*
   * Editor of record, and who actually pressed.
   *
   * These are two different facts and the site needs both. The editor is always
   * Ankur Singh: he is accountable for everything published here, which is what
   * his byline says and what /editorial-policy means by "approved by a person".
   * That does not change with whoever happens to be holding the phone.
   *
   * But the press itself belongs to somebody in particular, and recording the
   * editor as the presser would be writing down something that did not happen.
   * So the card names the editor and the stored note carries both.
   */
  const EDITOR_OF_RECORD = 'Ankur Singh (editor)';
  const pressedBy = query.from?.username
    ? `@${query.from.username}`
    : query.from?.id
      ? `Telegram user ${query.from.id}`
      : 'an unidentified Telegram user';

  const attribution =
    pressedBy === 'an unidentified Telegram user'
      ? EDITOR_OF_RECORD
      : `${EDITOR_OF_RECORD}, pressed by ${pressedBy}`;

  /*
   * Changing the picture is not a decision, so it runs before the
   * already-decided guard and leaves the queue exactly where it was. The card
   * stays open afterwards, because the point is to look again and then decide.
   */
  if (parsed.action === 'image') {
    const swap = await swapCoverPhoto(parsed.postId);
    await answerCallback(query.id, swap.message);

    if (swap.ok && swap.imageUrl && query.message) {
      const replaced = await replacePhoto(
        query.message.chat.id,
        query.message.message_id,
        absoluteUrl(swap.imageUrl),
        escapeMarkdown(swap.message),
        parsed.postId,
      );
      // A draft on the branded card has no photo to edit, so Telegram refuses
      // the swap. Say so rather than leaving the reviewer looking at the old
      // image wondering whether the button did anything.
      if (!replaced) {
        await sendNotice(
          escapeMarkdown(
            'The cover was changed, but this card could not be updated in place. ' +
              'Open it in /admin to see the new photograph.',
          ),
        );
      }
    }

    return ok({ action: 'image', postId: parsed.postId, swapped: swap.ok });
  }

  /*
   * First decision wins.
   *
   * In a group two people can tap the same card, and Telegram delivers the
   * second press if it lands before the first has finished editing the buttons
   * away. Applied blindly, two approvals send the next draft twice, and an
   * approve followed by a reject publishes an article and then archives it.
   *
   * The second press is answered, not applied: the person is told what already
   * happened, which is more useful than a silent no-op.
   */
  const already = await decidedOutcome(parsed.postId).catch(() => null);
  if (already) {
    await answerCallback(
      query.id,
      already === 'APPROVED' ? 'Already published by someone else.' : 'Already rejected by someone else.',
    );
    if (query.message) {
      await markResolved(
        query.message.chat.id,
        query.message.message_id,
        already === 'APPROVED' ? '✅ Published · Ankur Singh (editor)' : '✕ Rejected · Ankur Singh (editor)',
      );
    }
    return ok({ ignored: 'already decided', postId: parsed.postId, outcome: already });
  }

  const result =
    parsed.action === 'approve'
      ? await applyStatus(parsed.postId, 'PUBLISHED', attribution)
      : await archivePost(parsed.postId, `rejected from Telegram: ${attribution}`);

  await answerCallback(query.id, result.message);

  /**
   * Move the review queue on, but only on a decision that actually took.
   *
   * A publish refused for a missing cover has not been decided, and advancing
   * the cursor there would bury a draft that still needs an answer.
   */
  if (result.ok) {
    await recordReviewDecision(
      parsed.postId,
      parsed.action === 'approve' ? 'APPROVED' : 'REJECTED',
    ).catch(() => undefined);
  }

  // Only retire the buttons when something actually happened. A failed publish
  //, no cover image, say, should stay actionable once the cause is fixed.
  if (result.ok && query.message) {
    await markResolved(
      query.message.chat.id,
      query.message.message_id,
      parsed.action === 'approve'
        ? `✅ Published · ${EDITOR_OF_RECORD}`
        : `✕ Rejected · ${EDITOR_OF_RECORD}`,
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
