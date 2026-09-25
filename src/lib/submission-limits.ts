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
 * Counts words the way a writer counts them.
 *
 * Markdown syntax is stripped first, so `## A heading` is two words rather than
 * three and a link counts its label rather than its URL.
 *
 * There is deliberately no word limit to check this against. A long piece is an
 * editorial question, not a validation one, and a writer who has finished
 * should not be told to cut it by a form. `MAX_BODY_CHARS` remains the only
 * ceiling, and it is there to bound abuse rather than length — this count is
 * shown so a writer knows where they are, not to gate them.
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
