import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Captions and pictures are two parallel lists crossing a boundary, which is
 * the arrangement that quietly desynchronises. These tests exist because it
 * did: a file the store dropped used to shorten the image list without
 * shortening the caption list, and every caption after the gap moved up onto
 * the wrong picture.
 */

const put = vi.fn();

vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage');
  return { ...actual, storage: { put, remove: vi.fn() } };
});

// Pulled in by lib/submissions for the rate-limit helpers; nothing here touches it.
vi.mock('@/lib/db', () => ({ prisma: {} }));

const { storeSubmissionImages, toScreenshots } = await import('@/lib/submissions');
const { UploadError } = await import('@/lib/storage');

function file(name: string, bytes = 8) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

/** What an untouched <input type="file"> submits. */
function emptySlot() {
  return new File([], '', { type: 'application/octet-stream' });
}

beforeEach(() => {
  put.mockReset();
  put.mockImplementation(async ({ filename }: { filename: string }) => ({
    url: `/uploads/submissions/${filename}.png`,
    key: `submissions/${filename}.png`,
    size: 8,
    contentType: 'image/png',
  }));
});

describe('storeSubmissionImages', () => {
  it('keeps each caption on the picture it was written for', async () => {
    const { images } = await storeSubmissionImages(
      [file('one.png'), file('two.png')],
      'a-headline',
      ['first caption', 'second caption'],
    );

    expect(images.map((i) => i.title)).toEqual(['first caption', 'second caption']);
  });

  it('does not slide captions up when an empty slot sits between files', async () => {
    // Slots 2 and 4 of a four-slot form: the case that used to mispair.
    const { images } = await storeSubmissionImages(
      [emptySlot(), file('two.png'), emptySlot(), file('four.png')],
      'a-headline',
      ['', 'caption two', '', 'caption four'],
    );

    expect(images).toHaveLength(2);
    expect(images.map((i) => i.title)).toEqual(['caption two', 'caption four']);
  });

  it('does not slide captions up when a file is rejected', async () => {
    put.mockImplementation(async ({ filename }: { filename: string }) => {
      if (filename.includes('huge')) throw new UploadError('File is 9.0 MB; the limit is 8 MB.');
      return {
        url: `/uploads/submissions/${filename}.png`,
        key: `submissions/${filename}.png`,
        size: 8,
        contentType: 'image/png',
      };
    });

    const { images, skipped } = await storeSubmissionImages(
      [file('huge.png'), file('fine.png')],
      'a-headline',
      ['caption for the rejected one', 'caption for the kept one'],
    );

    expect(skipped).toHaveLength(1);
    expect(images.map((i) => i.title)).toEqual(['caption for the kept one']);
  });

  it('stores a picture with no caption rather than dropping it', async () => {
    const { images } = await storeSubmissionImages([file('one.png')], 'a-headline', []);
    expect(images).toEqual([{ url: expect.any(String), title: '' }]);
  });

  it('bounds a caption at the published length', async () => {
    const { images } = await storeSubmissionImages([file('one.png')], 'a-headline', [
      '  ' + 'x'.repeat(400) + '  ',
    ]);
    expect(images[0].title).toHaveLength(160);
  });

  it('reports the images beyond the limit instead of silently dropping them', async () => {
    const many = Array.from({ length: 6 }, (_, i) => file(`image-${i}.png`));
    const { images, skipped } = await storeSubmissionImages(many, 'a-headline', []);

    expect(images).toHaveLength(4);
    expect(skipped.some((s) => s.includes('first 4'))).toBe(true);
  });
});

describe('toScreenshots', () => {
  it('carries the contributor caption into the field the article renders', () => {
    const shots = JSON.parse(
      toScreenshots(JSON.stringify([{ url: '/uploads/a.png', title: 'What it shows' }])),
    );
    expect(shots).toEqual([{ url: '/uploads/a.png', alt: 'What it shows' }]);
  });

  it('survives malformed stored JSON', () => {
    expect(toScreenshots('not json')).toBe('[]');
    expect(toScreenshots('')).toBe('[]');
  });
});
