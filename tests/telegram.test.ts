import { describe, expect, it } from 'vitest';
import {
  TelegramUpdate,
  callbackData,
  escapeMarkdown,
  parseCallbackData,
} from '../src/lib/telegram';

describe('parseCallbackData', () => {
  it('reads the two actions it supports', () => {
    expect(parseCallbackData('approve:abc123')).toEqual({ action: 'approve', postId: 'abc123' });
    expect(parseCallbackData('reject:abc123')).toEqual({ action: 'reject', postId: 'abc123' });
  });

  it('round-trips with callbackData', () => {
    const data = callbackData('approve', 'cm2x9qk0000abcd');
    expect(parseCallbackData(data)).toEqual({ action: 'approve', postId: 'cm2x9qk0000abcd' });
  });

  it('stays inside Telegram 64-byte callback_data limit for a cuid', () => {
    expect(callbackData('approve', 'cm2x9qk0000abcd1234567890').length).toBeLessThanOrEqual(64);
  });

  // callback_data is attacker-controllable in principle: a bot username is
  // discoverable, so anything that is not exactly the expected shape is refused
  // rather than coerced into something.
  it('refuses anything that is not exactly action:id', () => {
    for (const bad of [
      undefined,
      '',
      'approve',
      'approve:',
      'delete:abc123',
      'approve:abc 123',
      'approve:abc;drop',
      "approve:' OR 1=1",
      'approve:abc123:extra',
      'APPROVE:abc123',
    ]) {
      expect(parseCallbackData(bad as string | undefined), `accepted ${String(bad)}`).toBeNull();
    }
  });

  it('refuses an id longer than a real one', () => {
    expect(parseCallbackData(`approve:${'a'.repeat(65)}`)).toBeNull();
  });
});

describe('escapeMarkdown', () => {
  it('escapes the characters MarkdownV2 would otherwise choke on', () => {
    expect(escapeMarkdown('Nani starrer: Rs. 113 Cr (6 days)')).toBe(
      'Nani starrer: Rs\\. 113 Cr \\(6 days\\)',
    );
  });

  it('escapes a headline full of punctuation without dropping characters', () => {
    const title = 'A-Z of "AI" — what now?!';
    const escaped = escapeMarkdown(title);
    expect(escaped.replace(/\\/g, '')).toBe(title);
  });
});

describe('TelegramUpdate', () => {
  it('accepts a real button press', () => {
    const parsed = TelegramUpdate.parse({
      update_id: 1,
      callback_query: {
        id: '99',
        data: 'approve:abc123',
        from: { id: 42, username: 'someone' },
        message: { message_id: 7, chat: { id: -100123 } },
      },
    });
    expect(parsed.callback_query?.data).toBe('approve:abc123');
    expect(parsed.callback_query?.message?.chat.id).toBe(-100123);
  });

  it('accepts an update with no callback at all', () => {
    expect(TelegramUpdate.parse({ update_id: 1, message: { text: 'hi' } })).toEqual({});
  });

  it('rejects a callback_query missing its id', () => {
    expect(() => TelegramUpdate.parse({ callback_query: { data: 'approve:x' } })).toThrow();
  });

  it('accepts a string chat id as well as numeric', () => {
    const parsed = TelegramUpdate.parse({
      callback_query: { id: '1', message: { message_id: 2, chat: { id: '-100123' } } },
    });
    expect(parsed.callback_query?.message?.chat.id).toBe('-100123');
  });
});
