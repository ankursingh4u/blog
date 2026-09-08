import { createHash } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

/**
 * File storage behind a narrow interface so the local-disk implementation can
 * be swapped for Supabase Storage at go-live without touching call sites.
 * Everything that writes an upload goes through `storage.put`.
 */
export interface StoredFile {
  /** Public URL, relative to the site root. */
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export interface Storage {
  put(input: {
    body: Buffer | Uint8Array;
    filename: string;
    contentType: string;
    prefix?: string;
  }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

const ALLOWED = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
]);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export class UploadError extends Error {}

function safeExtension(filename: string, contentType: string) {
  const fromType = ALLOWED.get(contentType);
  if (!fromType) {
    throw new UploadError(
      `Unsupported file type "${contentType}". Allowed: ${[...ALLOWED.keys()].join(', ')}.`,
    );
  }
  // Ignore the client-supplied extension entirely; derive it from the sniffed
  // content type so a ".php" upload cannot land on disk under that name.
  void filename;
  return fromType;
}

const localStorage: Storage = {
  async put({ body, filename, contentType, prefix = 'posts' }) {
    if (body.byteLength > MAX_UPLOAD_BYTES) {
      throw new UploadError(
        `File is ${(body.byteLength / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      );
    }
    const ext = safeExtension(filename, contentType);
    // Content-addressed: identical uploads dedupe, and the URL can be cached
    // immutably (see next.config.ts headers).
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 20);
    const cleanPrefix = prefix.replace(/[^a-z0-9-]/gi, '') || 'posts';
    const key = `${cleanPrefix}/${hash}.${ext}`;
    const target = path.join(UPLOAD_ROOT, key);

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);

    return {
      url: `/uploads/${key}`,
      key,
      size: body.byteLength,
      contentType,
    };
  },

  async remove(key) {
    const target = path.join(UPLOAD_ROOT, key);
    // Refuse to follow a key that escapes the upload root.
    if (!target.startsWith(UPLOAD_ROOT)) throw new UploadError('Invalid key.');
    await unlink(target).catch(() => undefined);
  },
};

export const storage: Storage = localStorage;
