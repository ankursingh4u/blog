import type { PostStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/db';
import { notifyPublished } from '@/lib/indexing';
import { categoryPath, postPath } from '@/lib/urls';

/**
 * Publishing and archiving, without any assumption about who is asking.
 *
 * Two callers authenticate in completely different ways: the admin UI by
 * session cookie, and the Telegram webhook by a shared secret plus a chat-id
 * check. Neither can use the other's mechanism, so the moderation rules live
 * here and each caller does its own authentication before delegating.
 *
 * The alternative, the webhook reimplementing "may this go live?", is how the
 * two paths end up disagreeing, and the one that disagrees is always the one
 * nobody is looking at.
 *
 * Nothing here checks permissions. Every exported function assumes the caller
 * has already established the right to moderate.
 */

export interface ModerationResult {
  ok: boolean;
  message: string;
}

/** Everything a post needs before it can be indexed by anyone. */
export function publishBlockers(post: {
  featuredImage: string | null;
  body: string;
  metaDescription: string;
}): string[] {
  const problems: string[] = [];
  if (!post.featuredImage) problems.push('no featured image');
  if (post.body.trim().length < 200) problems.push('body is too short');
  if (!post.metaDescription) problems.push('no meta description');
  return problems;
}

export async function applyStatus(id: string, status: PostStatus): Promise<ModerationResult> {
  const existing = await prisma.post.findUnique({
    where: { id },
    include: { category: { include: { parent: { select: { slug: true } } } } },
  });
  if (!existing) return { ok: false, message: 'That post no longer exists.' };

  if (status === 'PUBLISHED') {
    const problems = publishBlockers(existing);
    if (problems.length > 0) {
      return { ok: false, message: `Cannot publish: ${problems.join(', ')}.` };
    }
  }

  const post = await prisma.post.update({
    where: { id },
    data: {
      status,
      // publishedAt is set once, on first publish, and kept afterwards so the
      // canonical publication date does not move when a post is edited.
      publishedAt:
        status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
    },
    include: {
      category: { include: { parent: { select: { slug: true } } } },
      author: { select: { slug: true } },
    },
  });

  const path = postPath(post);
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath(categoryPath(post.category));
  revalidatePath(path);
  revalidatePath('/sitemap.xml');

  /*
   * The byline's own page, and the masthead.
   *
   * Both are built from the database and cached, and neither was refreshed when
   * an article went live. The result was an author page still saying "has not
   * published here yet" while their article was already on the homepage, and an
   * /about card still showing a count of zero. The person who just got their
   * first byline is exactly the person who goes and looks.
   */
  revalidatePath(`/author/${post.author.slug}`);
  revalidatePath('/about');

  if (status === 'PUBLISHED') {
    await notifyPublished([path]);
    return { ok: true, message: 'Published.' };
  }
  return { ok: true, message: `Status set to ${status.toLowerCase()}.` };
}

/**
 * Archive with a recorded reason.
 *
 * The reason is prepended to `qualityNotes` rather than given its own column,
 * because the deployment has no migration step, see the note on rejectPost in
 * actions.ts.
 */
export async function archivePost(id: string, reason: string): Promise<ModerationResult> {
  const existing = await prisma.post.findUnique({
    where: { id },
    select: { qualityNotes: true, title: true },
  });
  if (!existing) return { ok: false, message: 'That post no longer exists.' };

  const stamp = new Date().toISOString().slice(0, 10);
  const note = `REJECTED ${stamp}: ${reason.trim() || 'no reason given'}`;

  await prisma.post.update({
    where: { id },
    data: {
      status: 'ARCHIVED',
      qualityNotes: [note, existing.qualityNotes].filter(Boolean).join('\n\n'),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  return { ok: true, message: 'Rejected and archived.' };
}
