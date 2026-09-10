import { z } from 'zod';
import { storage } from '@/lib/storage';
import { botUserAgent } from '@/lib/site';
import type { ImageCreditData } from '@/lib/json';

/**
 * Openly-licensed photography via Openverse.
 *
 * Openverse is Wikimedia's search across roughly 700 million openly-licensed
 * images. It needs no API key and no account, which is why it is here rather
 * than Unsplash: the site had to stop spending, and this costs nothing.
 *
 * Two rules this module exists to enforce, because getting either wrong is a
 * legal problem rather than a bug:
 *
 *   1. **Commercial use only.** The site carries advertising, so a
 *      non-commercial licence is unusable. The search is filtered server-side
 *      rather than by hoping the results are fine.
 *   2. **Attribution travels with the image.** CC-BY and CC-BY-SA require the
 *      creator, the licence and a link. Downloading a photo and losing its
 *      credit turns a licensed image into an infringing one, so the credit is
 *      returned alongside the file and stored on the post.
 *
 * The chosen image is copied into local storage rather than hotlinked: a remote
 * URL can rot or change under you, and serving someone else's bandwidth from
 * every page view is rude regardless of the licence.
 */

const ENDPOINT = 'https://api.openverse.org/v1/images/';
const UA = botUserAgent();
/**
 * Openverse regularly takes well over 15 seconds for a cold query, and an
 * aborted search is indistinguishable from "no results" to the caller — which
 * silently produced empty picks for half a batch.
 */
const TIMEOUT_MS = 45_000;
/** Below this, a photo looks soft as a 1200px-wide cover. */
const MIN_WIDTH = 900;
const MAX_BYTES = 8 * 1024 * 1024;

const OpenverseResult = z.object({
  id: z.string(),
  title: z.string().nullish(),
  url: z.string(),
  thumbnail: z.string().nullish(),
  creator: z.string().nullish(),
  creator_url: z.string().nullish(),
  license: z.string(),
  license_version: z.string().nullish(),
  license_url: z.string().nullish(),
  foreign_landing_url: z.string().nullish(),
  source: z.string().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  filetype: z.string().nullish(),
});

const OpenverseResponse = z.object({
  result_count: z.number().default(0),
  results: z.array(OpenverseResult).default([]),
});

export interface ImageCandidate {
  id: string;
  title: string;
  /** Full-size original, used when the editor picks it. */
  url: string;
  /** Small preview for the picker grid. */
  thumbnail: string;
  creator: string;
  creatorUrl: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  sourceName: string;
  width: number;
  height: number;
}

/** Attribution shape lives in lib/json.ts, beside the other stored-JSON schemas. */
export type { ImageCreditData };

/** Human-readable licence name: "by-sa" + "4.0" becomes "CC BY-SA 4.0". */
export function licenceLabel(license: string, version?: string | null): string {
  if (!license) return '';
  const name = license.toUpperCase();
  // CC0 and the public-domain marks are not "CC CC0".
  if (name.startsWith('CC0') || name === 'PDM') return name === 'PDM' ? 'Public domain' : 'CC0';
  return `CC ${name}${version ? ` ${version}` : ''}`.trim();
}

export async function searchImages(
  query: string,
  limit = 12,
  /**
   * Restrict to particular Openverse providers, e.g. `['wikimedia']`.
   *
   * Worth having because providers differ in whether they will serve the file to
   * a non-browser client: Flickr answers 403, Wikimedia does not. The licence
   * permits the copy either way, so when a result set turns out to be entirely
   * unfetchable the fix is to ask a provider that will actually serve it.
   */
  sources?: string[],
): Promise<ImageCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    page_size: String(Math.min(limit, 20)),
    // Licences that permit commercial use. The site runs ads.
    license_type: 'commercial',
    mature: 'false',
  });
  if (sources?.length) params.set('source', sources.join(','));

  const response = await fetch(`${ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Openverse returned ${response.status}`);

  const parsed = OpenverseResponse.safeParse(await response.json());
  if (!parsed.success) throw new Error('Openverse returned an unexpected shape');

  return parsed.data.results
    .filter((r) => (r.width ?? 0) >= MIN_WIDTH)
    .map((r) => ({
      id: r.id,
      title: r.title ?? 'Untitled',
      url: r.url,
      thumbnail: r.thumbnail ?? r.url,
      creator: r.creator ?? 'Unknown',
      creatorUrl: r.creator_url ?? '',
      license: licenceLabel(r.license, r.license_version),
      licenseUrl: r.license_url ?? '',
      sourceUrl: r.foreign_landing_url ?? r.url,
      sourceName: r.source ?? 'Openverse',
      width: r.width ?? 0,
      height: r.height ?? 0,
    }));
}

export interface StoredImage {
  url: string;
  credit: ImageCreditData;
}

/** Widest we ever render a cover, so anything larger is bytes nobody sees. */
const STORE_WIDTH = 1600;

/**
 * Re-encodes an original down to something sane to serve.
 *
 * Openverse returns archive masters — 4000px and 5 MB is normal, and one run
 * left 53 MB of covers on disk for 34 articles. That weight is not harmless
 * here: `public/uploads` is committed to the repo and baked into the deployment
 * image, and `next/image` has to read the full file before it can resize it on
 * first request.
 *
 * WebP at 1600px keeps a cover sharp on a 2x display while cutting a typical
 * file by well over 90%. Failure is non-fatal — if sharp cannot decode
 * something, the original is stored as it was rather than losing the image.
 */
async function downscale(
  buffer: Buffer,
  contentType: string,
): Promise<{ body: Buffer; contentType: string; extension: string }> {
  const original = {
    body: buffer,
    contentType,
    extension: contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') ?? 'jpg',
  };

  try {
    const sharp = (await import('sharp')).default;
    const image = sharp(buffer, { failOn: 'none' });
    const meta = await image.metadata();
    if (!meta.width) return original;

    const body = await image
      .rotate() // honour EXIF orientation before resizing
      .resize({ width: Math.min(meta.width, STORE_WIDTH), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // Only keep the re-encode if it actually helped.
    if (body.byteLength >= buffer.byteLength) return original;
    return { body, contentType: 'image/webp', extension: 'webp' };
  } catch {
    return original;
  }
}

/**
 * Copies a chosen image into local storage and returns it with its credit.
 *
 * Verifies the response is actually an image before writing: the URL comes from
 * a third-party index, and a redirect to an HTML error page would otherwise be
 * saved as a `.jpg` and render as a broken cover.
 */
export async function storeImage(candidate: ImageCandidate, slug: string): Promise<StoredImage> {
  const response = await fetch(candidate.url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': UA, Accept: 'image/*' },
  });
  if (!response.ok) throw new Error(`Could not fetch the image (HTTP ${response.status}).`);

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`That URL returned ${contentType || 'no content type'}, not an image.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`That image is ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.`);
  }

  const { body, contentType: storedType, extension } = await downscale(buffer, contentType);
  const stored = await storage.put({
    body,
    filename: `${slug}-cover.${extension}`,
    contentType: storedType,
    prefix: 'covers',
  });

  return {
    url: stored.url,
    credit: {
      creator: candidate.creator,
      creatorUrl: candidate.creatorUrl,
      license: candidate.license,
      licenseUrl: candidate.licenseUrl,
      sourceUrl: candidate.sourceUrl,
      sourceName: candidate.sourceName,
      title: candidate.title,
    },
  };
}
