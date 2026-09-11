'use server';

import { prisma } from '@/lib/db';
import {
  RATE_LIMIT_MAX,
  SubmissionInput,
  rateLimitMessage,
  recentSubmissionCount,
  storeSubmissionImages,
} from '@/lib/submissions';

/**
 * The one server action reachable without logging in.
 *
 * Everything in src/lib/admin/actions.ts calls requireAdmin first; this cannot,
 * because the whole point is that a stranger can use it. It therefore does the
 * least it possibly can: validate, store, and stop. It never publishes, never
 * touches Post, and never renders what it was given.
 */

export interface SubmitState {
  ok: boolean;
  message: string;
  /** Field-level problems, keyed by input name. */
  errors?: Record<string, string>;
  /** Images that could not be stored — the article was still accepted. */
  warnings?: string[];
}

export async function submitArticle(
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  /**
   * Honeypot. A field hidden from people and irresistible to form-filling
   * bots; anything in it means the sender is not a reader. The response is a
   * cheerful success so a bot has nothing to tune against, and nothing is
   * written.
   */
  if (String(formData.get('website') ?? '').trim() !== '') {
    return { ok: true, message: 'Thanks — your article has been sent to the editors.' };
  }

  const parsed = SubmissionInput.safeParse({
    title: formData.get('title') ?? '',
    body: formData.get('body') ?? '',
    authorName: formData.get('authorName') ?? '',
    authorEmail: formData.get('authorEmail') ?? '',
    categoryId: (formData.get('categoryId') as string) || null,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, message: 'Please fix the highlighted fields.', errors };
  }

  const input = parsed.data;

  if ((await recentSubmissionCount(input.authorEmail)) >= RATE_LIMIT_MAX) {
    return { ok: false, message: rateLimitMessage() };
  }

  // A category the contributor picked has to exist; a stale or invented id
  // becomes "unfiled" rather than failing the submission.
  let categoryId: string | null = null;
  if (input.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    categoryId = category?.id ?? null;
  }

  const files = formData.getAll('images').filter((f): f is File => f instanceof File);
  const { images, skipped } = await storeSubmissionImages(files, input.title);

  await prisma.submission.create({
    data: {
      title: input.title,
      body: input.body,
      authorName: input.authorName,
      authorEmail: input.authorEmail.toLowerCase(),
      categoryId,
      images: JSON.stringify(images),
    },
  });

  return {
    ok: true,
    message:
      'Thanks — your article is with the editors. If it runs, it will be published under your name.',
    warnings: skipped.length > 0 ? skipped : undefined,
  };
}
