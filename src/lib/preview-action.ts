'use server';

import { renderSubmissionMarkdown } from '@/lib/markdown';
import { MAX_BODY_CHARS } from '@/lib/submission-limits';

/**
 * Renders what the contributor has typed so they can see it laid out.
 *
 * The preview runs here rather than in the browser on purpose. It is the same
 * sanitised pipeline the site itself renders through, so what the editor shows
 * is what would actually publish — a second, client-side markdown renderer
 * would drift from it — and remark plus rehype stay out of the page bundle.
 *
 * Like `submitArticle`, this is reachable without logging in, so it does the
 * least it can: no database, no writes, and the input is cut to the length a
 * submission is allowed to be before any parsing happens.
 */
export async function previewSubmission(markdown: string): Promise<string> {
  return renderSubmissionMarkdown(String(markdown ?? '').slice(0, MAX_BODY_CHARS));
}
