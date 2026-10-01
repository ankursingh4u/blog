import { z } from 'zod';

import { prisma } from '@/lib/db';
import { generateJson } from '@/lib/ai';
import { getSetting } from '@/lib/settings';
import { parseJson, FaqArray, SourceRefArray, StringArray } from '@/lib/json';
import { notifyPublished } from '@/lib/indexing';
import { postPath } from '@/lib/urls';
import { log } from '@/pipeline/log';
import { fetchSource, type ResearchSource } from '@/pipeline/research';
import { runQualityGate } from '@/pipeline/quality-gate';
import type { CategorySlug } from '@/pipeline/parser';

/**
 * One-off repairs over the existing catalogue.
 *
 * These exist because the site has been running for weeks and the rules have
 * moved underneath it: posts published before IndexNow was wired were never
 * announced, posts whose quality call failed carry a 0 that means nothing, and
 * the oldest posts predate the current meta-description rules. All three are
 * cheap to fix in bulk and impossible to fix by hand at this size.
 *
 * Every one is idempotent and reports what it touched. They are reached through
 * /api/cron/generate rather than a button because they are operations, not
 * editorial decisions, and the admin UI should not grow a control for something
 * that runs twice in a site's life.
 */

export interface BackfillResult {
  examined: number;
  changed: number;
  skipped: string[];
}

/**
 * Announce every published URL to IndexNow and ping the sitemap.
 *
 * New posts already do this on publish. Everything published before that was
 * wired — or while the key setting was empty — was never announced at all.
 *
 * Submitted in batches because IndexNow takes a list, and a single request per
 * URL would be both slower and more likely to be rate-limited.
 */
export async function pingAllPublished(): Promise<BackfillResult> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', publishedAt: { not: null } },
    include: { category: { include: { parent: { select: { slug: true } } } } },
    orderBy: { publishedAt: 'desc' },
  });

  const paths = posts.map((post) => postPath(post));
  if (paths.length === 0) return { examined: 0, changed: 0, skipped: ['nothing is published'] };

  const BATCH = 100;
  const skipped: string[] = [];
  let announced = 0;

  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const result = await notifyPublished(batch);
    if (result.indexNow.ok) announced += batch.length;
    else skipped.push(result.indexNow.skipped ?? 'IndexNow refused the batch');
  }

  log.info(`backfill: announced ${announced} of ${paths.length} published URL(s)`);
  return { examined: paths.length, changed: announced, skipped };
}

/**
 * Re-run the quality gate on every post scoring 0.
 *
 * A zero is what the gate records when its API call failed, not a verdict on
 * the article — see the note on `regradePost`. Sources are re-fetched because a
 * post stores each source's URL, not the text the gate needs.
 */
export async function regradeAllFailed(): Promise<BackfillResult> {
  const posts = await prisma.post.findMany({
    where: { qualityScore: 0 },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  const skipped: string[] = [];
  let changed = 0;

  for (const post of posts) {
    const refs = parseJson(post.sourceUrls, SourceRefArray, []);
    const sources: ResearchSource[] = [];
    for (const ref of refs) {
      try {
        const source = await fetchSource(ref.url);
        if (source.text.length >= 400) sources.push(source);
      } catch {
        // Gone from the publisher's site; score against what still resolves.
      }
    }

    if (sources.length === 0) {
      skipped.push(`${post.slug}: no source could be re-fetched`);
      continue;
    }

    const quality = await runQualityGate({
      draft: {
        title: post.title,
        slug: post.slug,
        quickAnswer: post.quickAnswer,
        body: post.body,
        affectedBuilds: parseJson(post.affectedBuilds, StringArray, []),
        faq: parseJson(post.faq, FaqArray, []),
        metaTitle: post.metaTitle ?? '',
        metaDescription: post.metaDescription ?? '',
        internalLinkSuggestions: [],
      },
      sources,
      verifiedIdentifiers: [post.testedOnBuild].filter((v): v is string => Boolean(v)),
      keywordPhrase: post.title,
      categorySlug: post.category.slug as CategorySlug,
    });

    if (quality.score === 0) {
      /**
       * Carry the reason through. "The review failed again" told an operator
       * nothing: the first run of this backfill reported exactly that for a
       * post whose gate had supposedly just been fixed, and there was no way
       * to tell a second length overrun from a refusal or a 429 without
       * redeploying to find out.
       */
      skipped.push(`${post.slug}: ${quality.notes.slice(0, 300)}`);
      continue;
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        qualityScore: quality.score,
        qualityNotes: `${quality.notes}\n\n(Re-graded: the original run's quality call failed.)`,
      },
    });
    changed += 1;
  }

  log.info(`backfill: re-graded ${changed} of ${posts.length} post(s) that scored 0`);
  return { examined: posts.length, changed, skipped };
}

const MetaSchema = z.object({
  metaTitle: z.string().min(10).max(70),
  metaDescription: z.string().min(70).max(160),
});

/**
 * Rewrite meta title and description where they are missing or out of bounds.
 *
 * Google truncates a title past roughly 60 characters and a description past
 * roughly 155, and an empty description leaves it to invent one from the page.
 * Posts written before those limits were enforced are the ones this is for.
 *
 * Deliberately not a rewrite of every post: one that already has a description
 * inside the limits is left alone, because paying a model to restate a working
 * description is spending for its own sake.
 */
export async function refreshSeoFields(): Promise<BackfillResult> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      quickAnswer: true,
      metaTitle: true,
      metaDescription: true,
    },
    orderBy: { publishedAt: 'asc' },
  });

  const needsWork = posts.filter((post) => {
    const title = post.metaTitle?.trim() ?? '';
    const description = post.metaDescription?.trim() ?? '';
    return (
      title.length === 0 ||
      title.length > 70 ||
      description.length === 0 ||
      description.length < 70 ||
      description.length > 160
    );
  });

  const skipped: string[] = [];
  let changed = 0;

  for (const post of needsWork) {
    try {
      const { data } = await generateJson({
        system:
          'You write search metadata for a news site. Use only what the article itself says. ' +
          'No clickbait, no invented figures, no quotation marks around the whole title.',
        prompt: [
          `TITLE: ${post.title}`,
          `SUMMARY: ${post.quickAnswer}`,
          '',
          'Write a meta title of at most 60 characters that reads naturally and keeps the ' +
            'main subject at the front, and a meta description of 120-155 characters that ' +
            'says what the reader will learn.',
        ].join('\n'),
        schema: MetaSchema,
        schemaName: 'post_metadata',
        // Naming a page is mechanical — the smallest configured model will do.
        model: await getSetting('AI_MODEL_META'),
        maxTokens: 2000,
        effort: 'low',
      });

      await prisma.post.update({
        where: { id: post.id },
        data: { metaTitle: data.metaTitle, metaDescription: data.metaDescription },
      });
      changed += 1;
    } catch (error) {
      skipped.push(`${post.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  log.info(
    `backfill: rewrote metadata on ${changed} post(s); ` +
      `${posts.length - needsWork.length} were already within the limits`,
  );
  return { examined: needsWork.length, changed, skipped };
}
