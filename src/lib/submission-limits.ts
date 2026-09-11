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

export const MAX_TITLE_CHARS = 140;
export const MAX_NAME_CHARS = 60;
export const MAX_EMAIL_CHARS = 160;

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Submissions allowed per email address per window. */
export const RATE_LIMIT = 3;
export const RATE_WINDOW_HOURS = 6;
