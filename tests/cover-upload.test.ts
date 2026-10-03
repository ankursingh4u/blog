import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TelegramUpdate,
  draftKeyboard,
  parseCallbackData,
} from '@/lib/telegram';

/**
 * Sending your own cover from the chat.
 *
 * The parsing and keyboard cases are pure. The handler cases below matter more
 * than they look: a photo message carries no reference to an article, so the
 * binding is conversational state, and the ways that goes wrong are putting a
 * picture on the wrong post, on a post already published, or treating an
 * ordinary photo in the group as a cover.
 */

describe('parseCallbackData', () => {
  it('accepts the upload action', () => {
    expect(parseCallbackData('upload:abc123')).toEqual({ action: 'upload', postId: 'abc123' });
  });

  it('still refuses anything it does not recognise', () => {
    expect(parseCallbackData('delete:abc123')).toBeNull();
    expect(parseCallbackData('upload:')).toBeNull();
    expect(parseCallbackData('upload:../../etc')).toBeNull();
  });
});

describe('draftKeyboard', () => {
  it('offers both image buttons, away from Approve', () => {
    const rows = draftKeyboard('p1').inline_keyboard;
    const decide = rows[0].map((b) => b.callback_data);
    const images = rows[1].map((b) => b.callback_data);

    expect(decide).toEqual(['approve:p1', 'reject:p1']);
    expect(images).toEqual(['image:p1', 'upload:p1']);
    // A mis-tap next to Approve publishes something nobody decided.
    expect(decide).not.toContain('upload:p1');
  });
});

describe('TelegramUpdate', () => {
  it('parses a compressed photo message and keeps the size order', () => {
    const parsed = TelegramUpdate.parse({
      message: {
        chat: { id: -100123 },
        photo: [
          { file_id: 'thumb', width: 90 },
          { file_id: 'mid', width: 640 },
          { file_id: 'full', width: 1280 },
        ],
      },
    });

    const photo = parsed.message?.photo;
    expect(photo).toHaveLength(3);
    // The handler takes the last entry; order must survive parsing.
    expect(photo?.[photo.length - 1].file_id).toBe('full');
  });

  it('parses an image sent as a file', () => {
    const parsed = TelegramUpdate.parse({
      message: {
        chat: { id: -100123 },
        document: { file_id: 'doc1', mime_type: 'image/png', file_name: 'cover.png' },
      },
    });
    expect(parsed.message?.document?.mime_type).toBe('image/png');
  });

  it('still parses a plain message with no attachment', () => {
    const parsed = TelegramUpdate.parse({ message: { chat: { id: 42, type: 'group' } } });
    expect(parsed.message?.photo).toBeUndefined();
    expect(parsed.message?.document).toBeUndefined();
  });
});

/* ------------------------------------------------- the handler, with the DB mocked */

const state: {
  awaiting: string;
  post: { id: string; title: string; status: string } | null;
  updated: Record<string, unknown> | null;
  stored: { url: string; size: number } | null;
  fetched: { body: Buffer; contentType: string } | null;
  putThrows: Error | null;
} = {
  awaiting: '',
  post: { id: 'p1', title: 'A draft', status: 'REVIEW' },
  updated: null,
  stored: { url: '/uploads/covers/abc.jpg', size: 2048 },
  fetched: { body: Buffer.from('jpegbytes'), contentType: 'image/jpeg' },
  putThrows: null,
};

vi.mock('@/lib/db', () => ({
  prisma: {
    setting: {
      findUnique: async ({ where }: { where: { key: string } }) =>
        where.key === 'AWAITING_PHOTO' && state.awaiting
          ? { key: 'AWAITING_PHOTO', value: state.awaiting }
          : null,
    },
    post: {
      findUnique: async () => state.post,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        state.updated = data;
        return { id: 'p1' };
      },
    },
  },
}));

vi.mock('@/lib/settings', () => ({
  setSetting: async (key: string, value: string) => {
    if (key === 'AWAITING_PHOTO') state.awaiting = value;
  },
}));

vi.mock('@/pipeline/log', () => ({ log: { info: () => {}, warn: () => {}, error: () => {} } }));

vi.mock('@/lib/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/telegram')>();
  return { ...actual, fetchTelegramFile: async () => state.fetched };
});

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...actual,
    storage: {
      put: async () => {
        if (state.putThrows) throw state.putThrows;
        return { ...state.stored, key: 'covers/abc.jpg', contentType: 'image/jpeg' };
      },
      remove: async () => {},
    },
  };
});

const { applyUploadedCover, isAwaitingCover, requestCoverUpload } = await import(
  '@/pipeline/cover-upload'
);
const { UploadError } = await import('@/lib/storage');

const armed = (minutesAgo = 0) =>
  JSON.stringify({ postId: 'p1', since: new Date(Date.now() - minutesAgo * 60_000).toISOString() });

beforeEach(() => {
  state.awaiting = '';
  state.post = { id: 'p1', title: 'A draft', status: 'REVIEW' };
  state.updated = null;
  state.fetched = { body: Buffer.from('jpegbytes'), contentType: 'image/jpeg' };
  state.putThrows = null;
});

describe('requestCoverUpload', () => {
  it('arms the upload and names the article', async () => {
    const result = await requestCoverUpload('p1');

    expect(result.ok).toBe(true);
    expect(result.message).toContain('A draft');
    expect(JSON.parse(state.awaiting).postId).toBe('p1');
  });

  it('refuses a draft that has already been decided', async () => {
    state.post = { id: 'p1', title: 'A draft', status: 'PUBLISHED' };

    const result = await requestCoverUpload('p1');

    expect(result.ok).toBe(false);
    expect(state.awaiting).toBe('');
  });
});

describe('isAwaitingCover', () => {
  it('is false with nothing armed, so an ordinary photo stays an ordinary photo', async () => {
    expect(await isAwaitingCover()).toBe(false);
  });

  it('expires, so a picture sent an hour later is not taken as a cover', async () => {
    state.awaiting = armed(60);
    expect(await isAwaitingCover()).toBe(false);

    state.awaiting = armed(2);
    expect(await isAwaitingCover()).toBe(true);
  });
});

describe('applyUploadedCover', () => {
  it('stores the picture and points the post at it', async () => {
    state.awaiting = armed(1);

    const result = await applyUploadedCover({ fileId: 'full', width: 1600 });

    expect(result.ok).toBe(true);
    expect(result.postId).toBe('p1');
    expect(state.updated?.featuredImage).toBe('/uploads/covers/abc.jpg');
    // Credited rather than blanked: an empty credit reads as an unrecorded licence.
    expect(String(state.updated?.imageCredit)).toContain('Supplied by the editor');
    // The intent is consumed, so the next photo is not swallowed too.
    expect(state.awaiting).toBe('');
  });

  it('warns when the picture is too narrow for Discover but still accepts it', async () => {
    state.awaiting = armed(1);

    const result = await applyUploadedCover({ fileId: 'full', width: 800 });

    expect(result.ok).toBe(true);
    expect(result.message).toContain('800px');
    expect(state.updated?.featuredImage).toBeTruthy();
  });

  it('does nothing when no draft is waiting', async () => {
    const result = await applyUploadedCover({ fileId: 'full' });

    expect(result.ok).toBe(false);
    expect(state.updated).toBeNull();
  });

  it('refuses once the draft has been decided elsewhere', async () => {
    state.awaiting = armed(1);
    state.post = { id: 'p1', title: 'A draft', status: 'PUBLISHED' };

    const result = await applyUploadedCover({ fileId: 'full' });

    expect(result.ok).toBe(false);
    expect(state.updated).toBeNull();
    expect(state.awaiting).toBe('');
  });

  it('keeps the intent armed when the download fails, so resending works', async () => {
    state.awaiting = armed(1);
    state.fetched = null;

    const result = await applyUploadedCover({ fileId: 'full' });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Try sending it again');
    // Still armed: the reviewer should not have to press the button twice.
    expect(state.awaiting).not.toBe('');
  });

  it('reports a rejected file type rather than writing it', async () => {
    state.awaiting = armed(1);
    state.putThrows = new UploadError('Unsupported file type "image/tiff".');

    const result = await applyUploadedCover({ fileId: 'full' });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Unsupported file type');
    expect(state.updated).toBeNull();
  });

  it('prefers the document mime when an image was sent as a file', async () => {
    state.awaiting = armed(1);
    state.fetched = { body: Buffer.from('png'), contentType: 'application/octet-stream' };

    const result = await applyUploadedCover({ fileId: 'doc1', mimeType: 'image/png' });

    // The file host answers octet-stream for documents, which storage rejects;
    // Telegram's own declaration is what makes this work.
    expect(result.ok).toBe(true);
  });
});
