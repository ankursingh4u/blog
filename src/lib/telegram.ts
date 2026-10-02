import { z } from 'zod';

/**
 * Telegram review notifications, and the callbacks they produce.
 *
 * A draft lands in the review queue and nobody sees it until someone opens
 * /admin. This pushes it to a chat with Approve and Reject buttons attached, so
 * the decision happens wherever you already are.
 *
 * Credentials come from the environment rather than the Setting table. A bot
 * token is a credential, anyone holding it can post as the bot and read the
 * chat, and settings are rendered back into the admin form as plain values.
 *
 * Everything here fails soft. A notification that cannot be sent must never
 * fail the pipeline run that produced the article: the article is written and
 * queued either way, and a silent Telegram outage is not a reason to lose it.
 */

const API = 'https://api.telegram.org';

export interface TelegramConfig {
  token: string;
  chatId: string;
  /** Sent by Telegram as X-Telegram-Bot-Api-Secret-Token on every webhook call. */
  webhookSecret: string;
}

export function telegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!token || !chatId || !webhookSecret) return null;
  return { token, chatId, webhookSecret };
}

/* ------------------------------------------------------------ callback data */

/**
 * Telegram caps `callback_data` at 64 bytes, so the payload is
 * `<action>:<postId>` and nothing else, no titles, no reasons.
 *
 * It is also attacker-controllable in principle: anyone who learns the bot's
 * username can press a button in their own chat with it. That is why the
 * webhook checks the chat id as well as the secret, and why this parser refuses
 * anything it does not recognise instead of coercing.
 */
export type CallbackAction = 'approve' | 'reject';

export interface ParsedCallback {
  action: CallbackAction;
  postId: string;
}

export function parseCallbackData(data: string | undefined): ParsedCallback | null {
  if (!data) return null;
  const match = /^(approve|reject):([A-Za-z0-9_-]{1,64})$/.exec(data.trim());
  if (!match) return null;
  return { action: match[1] as CallbackAction, postId: match[2] };
}

export function callbackData(action: CallbackAction, postId: string): string {
  return `${action}:${postId}`;
}

/* ----------------------------------------------------------------- incoming */

/**
 * Only the fields this app acts on. Telegram sends a great deal more, and
 * `passthrough` would invite reading something that has not been validated.
 */
export const TelegramUpdate = z.object({
  callback_query: z
    .object({
      id: z.string(),
      data: z.string().optional(),
      from: z.object({ id: z.number(), username: z.string().optional() }).optional(),
      message: z
        .object({
          message_id: z.number(),
          chat: z.object({ id: z.union([z.number(), z.string()]) }),
        })
        .optional(),
    })
    .optional(),
  /**
   * Plain messages, read for one purpose: learning a chat's id.
   *
   * Moving review into a group needs that id, and there is no way to look it up
   * from outside: getUpdates only works with the webhook removed, and removing
   * it breaks every Approve button until it is put back. Recording the id when
   * somebody messages the bot turns a timing exercise into "send a message,
   * then look".
   *
   * Nothing is acted on. The chat that may approve articles is still only the
   * one in TELEGRAM_CHAT_ID.
   */
  message: z
    .object({
      chat: z.object({
        id: z.union([z.number(), z.string()]),
        type: z.string().optional(),
        title: z.string().optional(),
        username: z.string().optional(),
      }),
    })
    .optional(),
});
export type TelegramUpdate = z.infer<typeof TelegramUpdate>;

/* ----------------------------------------------------------------- outgoing */

async function call(token: string, method: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Telegram's own escaping rules for MarkdownV2, an unescaped "." breaks the send. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export interface DraftNotification {
  postId: string;
  title: string;
  category: string;
  author: string;
  wordCount: number;
  score: number | null;
  adminUrl: string;
  /** Absolute URL of the cover, when there is one. */
  imageUrl?: string | null;
  /** Short line about padding/structure, straight from the quality notes. */
  verdict?: string;
}

/**
 * Posts a draft for review with Approve / Reject attached.
 *
 * Sent as a photo when there is a cover, because the picture is a large part of
 * what is being judged and a link preview is not guaranteed to render it.
 */
export async function notifyDraft(draft: DraftNotification): Promise<boolean> {
  const config = telegramConfig();
  if (!config) return false;

  const lines = [
    `*${escapeMarkdown(draft.title)}*`,
    '',
    `${escapeMarkdown(draft.category)} · ${escapeMarkdown(draft.author)}`,
    `${draft.wordCount} words${draft.score !== null ? ` · score ${draft.score}` : ''}`,
    draft.verdict ? escapeMarkdown(draft.verdict) : '',
    '',
    `[Open in admin](${draft.adminUrl})`,
  ].filter(Boolean);

  const reply_markup = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: callbackData('approve', draft.postId) },
        { text: '✕ Reject', callback_data: callbackData('reject', draft.postId) },
      ],
    ],
  };

  if (draft.imageUrl) {
    const sent = await call(config.token, 'sendPhoto', {
      chat_id: config.chatId,
      photo: draft.imageUrl,
      caption: lines.join('\n'),
      parse_mode: 'MarkdownV2',
      reply_markup,
    });
    if (sent) return true;
    // A cover Telegram cannot fetch must not cost the notification entirely.
  }

  return call(config.token, 'sendMessage', {
    chat_id: config.chatId,
    text: lines.join('\n'),
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    reply_markup,
  });
}

/**
 * A plain message with no buttons, cycle progress and the closing summary.
 *
 * Takes text already escaped for MarkdownV2 by the caller, because these
 * messages are assembled from fragments and escaping the finished string would
 * also escape the link syntax the caller just wrote.
 */
export async function sendNotice(markdown: string): Promise<boolean> {
  const config = telegramConfig();
  if (!config) return false;
  return call(config.token, 'sendMessage', {
    chat_id: config.chatId,
    text: markdown,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  });
}

/** Clears the button's loading spinner and shows a short toast. */
export async function answerCallback(id: string, text: string): Promise<boolean> {
  const config = telegramConfig();
  if (!config) return false;
  return call(config.token, 'answerCallbackQuery', { callback_query_id: id, text });
}

/**
 * Replaces the buttons with the outcome.
 *
 * Without this the buttons stay live and a second press runs the whole thing
 * again, approving something already rejected, in whichever order the taps
 * land.
 */
export async function markResolved(
  chatId: number | string,
  messageId: number,
  outcome: string,
): Promise<boolean> {
  const config = telegramConfig();
  if (!config) return false;
  return call(config.token, 'editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: outcome, callback_data: 'done' }]] },
  });
}
