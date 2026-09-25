/**
 * Submission limits, in a module with no imports.
 *
 * The form is a client component and needs these to tell a contributor what is
 * allowed before they spend time writing. Reading them from `lib/submissions`
 * dragged Prisma and `node:fs` into the browser bundle, which fails the build
 * outright — `UnhandledSchemeError: Reading from "node:crypto"`.
 *
 * Kept free of imports so both sides can use it. `lib/submissions` enforces
 * them; this only states them.
 */

/** Long enough to be an article, short enough to bound abuse. */
export const MIN_BODY_CHARS = 400;
export const MAX_BODY_CHARS = 40_000;

/**
 * The length a contributor is actually held to. `MAX_BODY_CHARS` stays as a
 * cheap outer bound — it is checked before anything is parsed — but 500 words
 * is the limit that gets shown and enforced.
 */
export const MAX_BODY_WORDS = 500;

/**
 * Counts words the way a writer counts them.
 *
 * Markdown syntax is stripped first, so `## A heading` is two words rather than
 * three and a link counts its label rather than its URL. The editor's counter
 * and the server's validator both call this, because a form that says 500 and a
 * server that disagrees is worse than having no counter at all.
 */
export function countWords(markdown: string): number {
  const text = (markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~]/g, '')
    .trim();

  return text ? text.split(/\s+/).length : 0;
}

export const MAX_TITLE_CHARS = 140;
export const MAX_NAME_CHARS = 60;
export const MAX_EMAIL_CHARS = 160;
export const MAX_BIO_CHARS = 300;
/** Caption length for an in-body image. */
export const MAX_CAPTION_CHARS = 160;

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Submissions allowed per email address per window. */
export const RATE_LIMIT = 3;
export const RATE_WINDOW_HOURS = 6;
