import { z } from 'zod';
import { prisma } from '@/lib/db';
import { storage, UploadError } from '@/lib/storage';
import { slugify } from '@/lib/utils';
import {
  MAX_BIO_CHARS,
  MAX_BODY_CHARS,
  MAX_CAPTION_CHARS,
  MAX_EMAIL_CHARS,
  MAX_IMAGES,
  MAX_NAME_CHARS,
  MAX_TITLE_CHARS,
  MIN_BODY_CHARS,
  RATE_LIMIT,
  RATE_WINDOW_HOURS,
} from '@/lib/submission-limits';

/**
 * Reader-submitted articles.
 *
 * The form at /write is open to anyone, with no account and no login, so
 * everything here assumes the input is hostile until an editor has read it.
 * Three consequences run through this file:
 *
 *   - Submissions live in their own table, never in Post. Unreviewed text
 *     cannot be reached by a public query that forgot a status filter.
 *   - Nothing submitted is rendered as HTML or markdown on the public site.
 *     The body is stored as plain text and only becomes a post when an editor
 *     accepts it, at which point it goes through the same sanitiser as
 *     everything else.
 *   - The contributor's email is stored for replies and never rendered.
 *
 * Accepting a submission creates a guest Author so the byline is a real profile
 * with its own page, rather than a name floating on a post. Guests are excluded
 * from the generation pool — see assignAuthor.
 */


export const SubmissionInput = z.object({
  title: z
    .string()
    .trim()
    .min(12, 'Give the article a headline of at least 12 characters.')
    .max(MAX_TITLE_CHARS, `Headlines longer than ${MAX_TITLE_CHARS} characters get cut off everywhere they appear.`),
  body: z
    .string()
    .trim()
    .min(MIN_BODY_CHARS, `Articles need at least ${MIN_BODY_CHARS} characters — roughly a short page.`)
    .max(MAX_BODY_CHARS, 'That is longer than we can accept in one submission.'),
  authorName: z
    .string()
    .trim()
    .min(2, 'Tell us what name should appear on the byline.')
    .max(MAX_NAME_CHARS, 'That name is too long for a byline.'),
  authorEmail: z
    .string()
    .trim()
    .email('That email address does not look right — we need it to reply to you.')
    .max(MAX_EMAIL_CHARS),
  authorBio: z
    .string()
    .trim()
    .max(MAX_BIO_CHARS, `Keep it under ${MAX_BIO_CHARS} characters.`)
    .default(''),
  authorUrl: z
    .string()
    .trim()
    .url('That link does not look like a URL. Include https://.')
    .max(200)
    .or(z.literal(''))
    .default(''),
  categoryId: z.string().trim().min(1).nullable().catch(null),
});

/** A caption is trimmed and bounded, never dropped — a picture with no caption
 * is still a picture. */
function cleanCaption(caption: string | undefined): string {
  return (caption ?? '').trim().slice(0, MAX_CAPTION_CHARS);
}

export type SubmissionInput = z.infer<typeof SubmissionInput>;

export interface SubmissionImage {
  url: string;
  /** Caption the contributor gave this picture. */
  title: string;
}

/**
 * How many submissions one address may send per window.
 *
 * Deliberately generous: this is a brake on a script, not a quota for a person.
 * Email is trivially faked, so this is a nuisance filter rather than security —
 * the real control is that an editor reads everything before it can publish.
 */

export async function recentSubmissionCount(email: string): Promise<number> {
  const since = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000);
  return prisma.submission.count({
    where: { authorEmail: email.trim().toLowerCase(), createdAt: { gte: since } },
  });
}

export function rateLimitMessage(): string {
  return `That is ${RATE_LIMIT} submissions in ${RATE_WINDOW_HOURS} hours from this address. Give us a chance to read them first.`;
}

export const RATE_LIMIT_MAX = RATE_LIMIT;

/**
 * Stores images that came in with a submission, each keeping the caption it was
 * sent with.
 *
 * Type and size are already enforced by `storage.put`; this only bounds the
 * count and turns a rejected file into a message rather than a failed
 * submission — losing a whole article because the fourth image was a PDF would
 * be a poor trade.
 *
 * Captions are matched against the position of the file *as submitted*, before
 * anything is dropped, and then carried on the stored record. Pairing them
 * afterwards is what broke: a skipped file — an empty slot, an oversized
 * picture, a failed write — shortened the stored list without shortening the
 * caption list, and every caption after the gap slid onto the wrong image.
 */
export async function storeSubmissionImages(
  files: File[],
  slugHint: string,
  captions: string[] = [],
): Promise<{ images: SubmissionImage[]; skipped: string[] }> {
  const images: SubmissionImage[] = [];
  const skipped: string[] = [];

  const considered = files.slice(0, MAX_IMAGES);
  for (const [index, file] of considered.entries()) {
    if (file.size === 0) continue;
    try {
      const stored = await storage.put({
        body: Buffer.from(await file.arrayBuffer()),
        filename: `${slugify(slugHint) || 'submission'}-${file.name}`,
        contentType: file.type,
        prefix: 'submissions',
      });
      images.push({ url: stored.url, title: cleanCaption(captions[index]) });
    } catch (error) {
      skipped.push(
        error instanceof UploadError
          ? `${file.name}: ${error.message}`
          : `${file.name}: could not be stored.`,
      );
    }
  }

  if (files.length > MAX_IMAGES) {
    skipped.push(`Only the first ${MAX_IMAGES} images were kept.`);
  }

  return { images, skipped };
}


/**
 * Finds the guest author for an email, or creates one.
 *
 * Matching on email means a returning contributor keeps the same byline and
 * author page instead of accumulating a new profile per article. The slug is
 * derived from the name and de-duplicated, because two contributors called
 * Alex Kumar are not the same person.
 */
export async function guestAuthorFor(name: string, email: string, bio = '') {
  const normalised = email.trim().toLowerCase();
  const existing = await prisma.author.findFirst({ where: { email: normalised, isGuest: true } });
  if (existing) {
    // A returning contributor may have written a better description of
    // themselves since last time. Only fill a gap or replace the placeholder —
    // never overwrite a bio an editor has since rewritten.
    const placeholder = existing.bio.endsWith('contributed this article to Favo News.');
    if (bio.trim() && (!existing.bio.trim() || placeholder)) {
      return prisma.author.update({ where: { id: existing.id }, data: { bio: bio.trim() } });
    }
    return existing;
  }

  const base = slugify(name) || 'contributor';
  let slug = base;
  for (let n = 2; await prisma.author.findUnique({ where: { slug } }); n += 1) {
    slug = `${base}-${n}`;
  }

  return prisma.author.create({
    data: {
      name: name.trim(),
      slug,
      email: normalised,
      isGuest: true,
      // Their own words if they gave any, otherwise a plain statement of fact.
      // Inventing credentials for someone who sent in one article is exactly
      // the fake authority the editorial policy rules out.
      bio: bio.trim() || `${name.trim()} contributed this article to Favo News.`,
      categoryFocus: '[]',
      stylePrompt: '',
    },
  });
}

/**
 * Converts stored submission images into a Post's `screenshots` shape.
 *
 * The two differ in one field and it matters: a submission keeps the
 * contributor's caption in `title`, while a post keeps it in `alt`, which is
 * what the article template renders as the figcaption. Passing the raw JSON
 * straight through parses cleanly — `alt` simply defaults to an empty string —
 * so every caption would vanish with nothing to indicate it had.
 *
 * Using the caption as the alt text is deliberate. It describes the picture,
 * which is exactly what a screen reader needs, and an empty alt on a
 * content image is worse than an imperfect one.
 */
export function toScreenshots(imagesJson: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(imagesJson || '[]');
  } catch {
    return '[]';
  }
  if (!Array.isArray(parsed)) return '[]';

  const shots = parsed
    .filter((i): i is { url: string; title?: string } => Boolean(i) && typeof i === 'object' && 'url' in i)
    .map((i) => ({ url: String(i.url), alt: String(i.title ?? '').trim() }));

  return JSON.stringify(shots);
}
