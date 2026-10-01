import { prisma } from '@/lib/db';
import { absoluteUrl } from '@/lib/site';
import { log } from '@/pipeline/log';
import { escapeMarkdown, notifyDraft, sendNotice } from '@/lib/telegram';
import { runPipeline } from '@/pipeline/run';
import {
  clearCycle,
  currentEntry,
  fullyRejectedCategories,
  isComplete,
  newCycle,
  readCycle,
  recordOutcome,
  rejectedEntries,
  writeCycle,
  type CycleEntry,
  type Outcome,
  type ReviewCycle,
} from '@/lib/review-queue';

/**
 * Drives the review queue: show one draft, wait, show the next.
 *
 * Kept out of the webhook route so the admin UI can advance the same queue -
 * approving in /admin has to move the cursor too, or the chat would sit waiting
 * on a draft that was decided somewhere else.
 *
 * Nothing here decides whether a post may go live. That is moderation.ts, and
 * the callers do it before handing control over.
 */

/** Sends whichever draft the cursor is on. No-op when the cycle is finished. */
export async function sendNextForReview(): Promise<boolean> {
  const cycle = await readCycle();
  if (!cycle) return false;

  const entry = currentEntry(cycle);
  if (!entry) return false;

  const post = await prisma.post.findUnique({
    where: { id: entry.postId },
    include: { author: { select: { name: true } }, category: { select: { name: true } } },
  });

  /**
   * A draft that has gone, deleted, or already decided in /admin, must not
   * stall the queue. Step over it and show the next one instead.
   */
  if (!post || post.status !== 'REVIEW') {
    const skipped: ReviewCycle = { ...cycle, cursor: cycle.cursor + 1 };
    await writeCycle(skipped);
    if (isComplete(skipped)) return finishCycle(skipped);
    return sendNextForReview();
  }

  const position = cycle.cursor + 1;
  const words = post.body.trim().split(/\s+/).filter(Boolean).length;

  return notifyDraft({
    postId: post.id,
    title: post.title,
    category: `${post.category.name} · ${position}/${cycle.entries.length}`,
    author: post.author.name,
    wordCount: words,
    score: post.qualityScore,
    adminUrl: absoluteUrl(`/admin/posts/${post.id}`),
    imageUrl: post.featuredImage ? absoluteUrl(post.featuredImage) : null,
  });
}

/**
 * Records a decision and moves the queue on.
 *
 * Returns quietly when there is no open cycle: a draft can be approved from
 * /admin at any time, including one that predates the queue entirely.
 */
export async function recordReviewDecision(postId: string, outcome: Outcome): Promise<void> {
  const cycle = await readCycle();
  if (!cycle) return;
  if (!cycle.entries.some((entry) => entry.postId === postId)) return;

  const updated = recordOutcome(cycle, postId, outcome);
  await writeCycle(updated);

  if (isComplete(updated)) {
    await finishCycle(updated);
    return;
  }
  await sendNextForReview();
}

/**
 * Everything has been decided: report, then regenerate what came back empty.
 *
 * The summary goes first so the chat reads as a conclusion, what was kept,
 * what was not, before the replacements start arriving.
 */
async function finishCycle(cycle: ReviewCycle): Promise<boolean> {
  const rejected = rejectedEntries(cycle);
  const approved = cycle.entries.length - rejected.length;

  const lines = [
    `*${escapeMarkdown(cycle.isRegenerationRound ? 'Replacements reviewed' : 'Cycle complete')}*`,
    '',
    escapeMarkdown(`${approved} approved · ${rejected.length} rejected`),
  ];

  if (rejected.length > 0) {
    lines.push('', `*${escapeMarkdown('Rejected')}*`);
    for (const entry of rejected) {
      lines.push(
        `· ${escapeMarkdown(entry.categoryName)}, [${escapeMarkdown(
          entry.title.slice(0, 70),
        )}](${absoluteUrl(`/admin/posts/${entry.postId}`)})`,
      );
    }
  }

  const toRegenerate = cycle.isRegenerationRound ? [] : fullyRejectedCategories(cycle);

  if (toRegenerate.length > 0) {
    lines.push(
      '',
      escapeMarkdown(
        `Nothing was kept in: ${toRegenerate.join(', ')}. Writing replacements now, ` +
          'they will arrive here shortly.',
      ),
    );
  }

  await sendNotice(lines.join('\n'));

  if (toRegenerate.length === 0) {
    await clearCycle();
    return true;
  }

  /**
   * Regeneration is started but not awaited.
   *
   * The caller is usually the Telegram webhook, which must answer quickly:
   * Telegram retries anything that is slow or non-2xx, and a retry would replay
   * the decision that got us here. Writing four articles takes minutes. This
   * container is a long-lived Node process, so the promise outlives the
   * response; failures are logged rather than thrown into a dead request.
   */
  void regenerateCategories(toRegenerate, cycle).catch((error) => {
    log.error(`cycle: regeneration failed, ${error instanceof Error ? error.message : error}`);
  });

  return true;
}

/**
 * Writes fresh drafts for categories where nothing was kept, and queues them.
 *
 * The new cycle is marked as a regeneration round, which is what stops this
 * repeating: if the replacements are also rejected, the round ends with a
 * summary instead of another generation.
 */
async function regenerateCategories(slugs: string[], previous: ReviewCycle): Promise<void> {
  const all = await prisma.category.findMany({
    where: { parentId: null },
    select: { slug: true },
  });
  const exclude = all.map((c) => c.slug).filter((slug) => !slugs.includes(slug));

  const produced: CycleEntry[] = [];
  for (const slug of slugs) {
    const result = await runPipeline({
      skipIngest: true,
      limit: 2,
      excludeCategorySlugs: [...exclude, ...slugs.filter((s) => s !== slug)],
      notify: false,
    });

    const ids = result.outcomes
      .filter((o) => o.status === 'REVIEW' && o.postId)
      .map((o) => o.postId!);
    if (ids.length === 0) continue;

    const posts = await prisma.post.findMany({
      where: { id: { in: ids }, status: 'REVIEW' },
      select: { id: true, title: true, category: { select: { slug: true, name: true } } },
    });
    produced.push(
      ...posts.map((post) => ({
        postId: post.id,
        categorySlug: post.category.slug,
        categoryName: post.category.name,
        title: post.title,
      })),
    );
  }

  if (produced.length === 0) {
    await sendNotice(
      escapeMarkdown(
        'No replacement could be written, the feeds had nothing else citable for those ' +
          'sections. Nothing is waiting on you.',
      ),
    );
    await clearCycle();
    return;
  }

  const next = newCycle(produced, true);
  next.regenerated = [...previous.regenerated, ...slugs];
  await writeCycle(next);
  await sendNextForReview();
}
