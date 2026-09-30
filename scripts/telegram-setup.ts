import 'dotenv/config';
import crypto from 'node:crypto';

/**
 * Registers the Telegram webhook, and tells you what to set where.
 *
 * Run it yourself rather than handing the bot token to anyone: whoever holds it
 * can post as the bot and read the chat.
 *
 *   npx tsx scripts/telegram-setup.ts --check      show current state, change nothing
 *   npx tsx scripts/telegram-setup.ts --register   point the bot at this site
 *   npx tsx scripts/telegram-setup.ts --secret     print a fresh webhook secret
 *   npx tsx scripts/telegram-setup.ts --test       send a test message to the chat
 *
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET and
 * NEXT_PUBLIC_SITE_URL from the environment.
 *
 * Getting the values, if you have not yet:
 *   1. Message @BotFather, /newbot, copy the token          -> TELEGRAM_BOT_TOKEN
 *   2. Add the bot to the chat you want, send it a message,
 *      then open https://api.telegram.org/bot<TOKEN>/getUpdates
 *      and read result[].message.chat.id                    -> TELEGRAM_CHAT_ID
 *   3. `--secret` here                                      -> TELEGRAM_WEBHOOK_SECRET
 *
 * All three go in Coolify's environment variables, then redeploy, then
 * `--register`. Registration must happen after the deploy, or Telegram will be
 * pointing at a route that is not live yet.
 */

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/$/, '');

function bail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

async function api(method: string, body?: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json() as Promise<{ ok: boolean; result?: unknown; description?: string }>;
}

async function main() {
  if (process.argv.includes('--secret')) {
    console.log(`\n  TELEGRAM_WEBHOOK_SECRET=${crypto.randomBytes(24).toString('hex')}\n`);
    return;
  }

  if (!token) bail('TELEGRAM_BOT_TOKEN is not set.');

  if (process.argv.includes('--check')) {
    const me = await api('getMe');
    const hook = await api('getWebhookInfo');
    console.log('\n  bot:', JSON.stringify(me.result ?? me.description));
    console.log('  webhook:', JSON.stringify(hook.result ?? hook.description));
    console.log('  chat id set:', chatId ? 'yes' : 'NO — TELEGRAM_CHAT_ID is missing');
    console.log('  webhook secret set:', secret ? 'yes' : 'NO — TELEGRAM_WEBHOOK_SECRET is missing');
    console.log();
    return;
  }

  if (process.argv.includes('--test')) {
    if (!chatId) bail('TELEGRAM_CHAT_ID is not set.');
    const sent = await api('sendMessage', {
      chat_id: chatId,
      text: 'favo.news: Telegram is wired up correctly.',
    });
    console.log(sent.ok ? '\n  Sent. Check the chat.\n' : `\n  Failed: ${sent.description}\n`);
    return;
  }

  if (process.argv.includes('--register')) {
    if (!secret) bail('TELEGRAM_WEBHOOK_SECRET is not set. Generate one with --secret first.');
    if (!siteUrl || siteUrl.includes('localhost')) {
      bail(`NEXT_PUBLIC_SITE_URL must be the public https URL, got "${siteUrl || '(empty)'}".`);
    }

    const url = `${siteUrl}/api/telegram/webhook`;
    const result = await api('setWebhook', {
      url,
      secret_token: secret,
      // Everything else Telegram sends is noise for this bot.
      allowed_updates: ['callback_query'],
      drop_pending_updates: true,
    });
    console.log(
      result.ok ? `\n  Webhook registered: ${url}\n` : `\n  Failed: ${result.description}\n`,
    );
    return;
  }

  console.log(`
  Usage:
    npx tsx scripts/telegram-setup.ts --secret     generate TELEGRAM_WEBHOOK_SECRET
    npx tsx scripts/telegram-setup.ts --check      show bot and webhook state
    npx tsx scripts/telegram-setup.ts --register   point the bot at this site
    npx tsx scripts/telegram-setup.ts --test       send a test message
`);
}

main().catch((error) => bail(error instanceof Error ? error.message : String(error)));
