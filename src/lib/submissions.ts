import { z } from 'zod';
import { prisma } from '@/lib/db';
import { storage, UploadError } from '@/lib/storage';
import { slugify } from '@/lib/utils';
import {
  MAX_BODY_CHARS,
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
  categoryId: z.string().trim().min(1).nullable().catch(null),
});

export type SubmissionInput = z.infer<typeof SubmissionInput>;

export interface SubmissionImage {
  url: string;
  alt: string;
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
 * Stores images that came in with a submission.
 *
 * Type and size are already enforced by `storage.put`; this only bounds the
 * count and turns a rejected file into a message rather than a failed
 * submission — losing a whole article because the fourth image was a PDF would
 * be a poor trade.
 */
export async function storeSubmissionImages(
  files: File[],
  slugHint: string,
): Promise<{ images: SubmissionImage[]; skipped: string[] }> {
  const images: SubmissionImage[] = [];
  const skipped: string[] = [];

  for (const file of files.slice(0, MAX_IMAGES)) {
    if (file.size === 0) continue;
    try {
      const stored = await storage.put({
        body: Buffer.from(await file.arrayBuffer()),
        filename: `${slugify(slugHint) || 'submission'}-${file.name}`,
        contentType: file.type,
        prefix: 'submissions',
      });
      images.push({ url: stored.url, alt: '' });
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
export async function guestAuthorFor(name: string, email: string) {
  const normalised = email.trim().toLowerCase();
  const existing = await prisma.author.findFirst({ where: { email: normalised, isGuest: true } });
  if (existing) return existing;

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
      // Honest and minimal. Inventing credentials for someone who sent in one
      // article is exactly the kind of fake authority the editorial policy
      // rules out.
      bio: `${name.trim()} contributed this article to Favo News.`,
      categoryFocus: '[]',
      stylePrompt: '',
    },
  });
}
