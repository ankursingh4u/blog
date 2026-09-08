import { prisma } from '@/lib/db';
import { asBool, asInt, getSettings } from '@/lib/settings';
import { hasApiKey, readUsage, resetUsage } from '@/lib/ai';
import { toJson } from '@/lib/json';
import { slugify } from '@/lib/utils';
import { notifyPublished } from '@/lib/indexing';
import { checkStructure, describeStructure } from '@/pipeline/structure';
import { checkStyle, describeStyle } from '@/pipeline/style';
import { categoryPath, postPath, type CategoryRef } from '@/lib/urls';

import { log, type LogLine } from '@/pipeline/log';
import type { CategorySlug } from '@/pipeline/parser';

/** Candidates fetched per post wanted, to absorb keywords that cannot be sourced. */
const KEYWORD_OVERSELECT = 6;
import { ingest } from '@/pipeline/ingest';
import { assignAuthor, selectKeywords } from '@/pipeline/select';
import { research } from '@/pipeline/research';
import { generateDraft } from '@/pipeline/generate';
import { runQualityGate } from '@/pipeline/quality-gate';
import { suggestInternalLinks } from '@/pipeline/internal-links';
import { generateFeaturedImage } from '@/pipeline/featured-image';

/**
 * The daily run: ingest → select → assign → research → generate → quality gate
 * → internal links → featured image → publish decision.
 *
 * One post failing does not fail the run. Each keyword is wrapped so a bad
 * fetch or a refused generation marks that keyword SKIPPED and moves on.
 */

export interface PipelineOutcome {
  keyword: string;
  status: 'PUBLISHED' | 'REVIEW' | 'FAILED';
  postId?: string;
  slug?: string;
  score?: number;
  blocked?: boolean;
  error?: string;
}

export interface PipelineRunResult {
  startedAt: string;
  finishedAt: string;
  ingested: number;
  attempted: number;
  published: number;
  inReview: number;
  failed: number;
  outcomes: PipelineOutcome[];
  logs: LogLine[];
}

export async function runPipeline(
  options: { skipIngest?: boolean; limit?: number; excludeCategorySlugs?: string[] } = {},
): Promise<PipelineRunResult> {
  const startedAt = new Date().toISOString();
  log.reset();

  if (!hasApiKey()) {
    log.error('OPENAI_API_KEY is not set — the pipeline cannot generate anything.');
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      ingested: 0,
      attempted: 0,
      published: 0,
      inReview: 0,
      failed: 0,
      outcomes: [],
      logs: log.recent(),
    };
  }

  const settings = await getSettings();
  const postsPerRun = Math.min(options.limit ?? asInt(settings.POSTS_PER_DAY, 2), 3);
  const autoPublish = asBool(settings.AUTO_PUBLISH);
  const threshold = asInt(settings.QUALITY_THRESHOLD, 85);

  log.info(
    `run: posts=${postsPerRun} autoPublish=${autoPublish} threshold=${threshold}`,
  );

  let ingested = 0;
  if (!options.skipIngest) {
    const result = await ingest();
    ingested = result.inserted;
  }

  // Over-select. Most keywords come from trending headlines, and a publisher
  // feed holds only its last few dozen items, so a given story often has no
  // citable source and is skipped before it costs a generation call. Asking for
  // more candidates than posts lets the run walk past those and still fill its
  // quota; without it a run of 3 could skip 3 and produce nothing.
  const candidates = await selectKeywords(
    postsPerRun * KEYWORD_OVERSELECT,
    options.excludeCategorySlugs ?? [],
  );
  const outcomes: PipelineOutcome[] = [];
  let previousAuthorId: string | null = null;
  let produced = 0;
  let attempted = 0;

  for (const keyword of candidates) {
    if (produced >= postsPerRun) break;
    attempted += 1;

    try {
      const outcome = await produceOne({
        keywordId: keyword.id,
        autoPublish,
        threshold,
        previousAuthorId,
      });
      outcomes.push(outcome);
      produced += 1;
      if (outcome.postId) {
        const post = await prisma.post.findUnique({
          where: { id: outcome.postId },
          select: { authorId: true },
        });
        previousAuthorId = post?.authorId ?? previousAuthorId;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`"${keyword.phrase}" failed — ${message}`);
      await prisma.keyword
        .update({ where: { id: keyword.id }, data: { status: 'SKIPPED' } })
        .catch(() => undefined);
      outcomes.push({ keyword: keyword.phrase, status: 'FAILED', error: message });
    }
  }

  if (produced < postsPerRun) {
    log.warn(
      `run: wanted ${postsPerRun} post(s) but produced ${produced} after trying ` +
        `${attempted} keyword(s) — most had no citable source.`,
    );
  }

  const published = outcomes.filter((o) => o.status === 'PUBLISHED').length;
  const inReview = outcomes.filter((o) => o.status === 'REVIEW').length;
  const failed = outcomes.filter((o) => o.status === 'FAILED').length;

  log.info(`run: ${published} published, ${inReview} in review, ${failed} failed`);

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    ingested,
    attempted,
    published,
    inReview,
    failed,
    outcomes,
    logs: log.recent(),
  };
}

async function produceOne({
  keywordId,
  autoPublish,
  threshold,
  previousAuthorId,
}: {
  keywordId: string;
  autoPublish: boolean;
  threshold: number;
  previousAuthorId: string | null;
}): Promise<PipelineOutcome> {
  const keyword = await prisma.keyword.findUniqueOrThrow({ where: { id: keywordId } });
  log.info(`--- "${keyword.phrase}"`);

  const categoryInclude = { parent: { select: { name: true, slug: true } } };
  const category = keyword.categoryId
    ? await prisma.category.findUnique({
        where: { id: keyword.categoryId },
        include: categoryInclude,
      })
    : await prisma.category.findFirst({ orderBy: { position: 'asc' }, include: categoryInclude });
  if (!category) throw new Error('No category available — run the seed first.');

  const author = await assignAuthor(category.slug, previousAuthorId);
  if (!author) throw new Error('No authors exist — run the seed first.');
  log.info(`author: ${author.name}`);

  // Token accounting is per post, so the tally starts clean here rather than at
  // the top of the run — a keyword skipped for want of sources costs nothing and
  // should not be averaged in.
  resetUsage();

  const sources = await research(keyword, category.slug as CategorySlug);

  // Generating without sources is not worth paying for outside troubleshooting.
  // A Windows guide still has Microsoft's documentation to fall back on, but a
  // general-interest draft with nothing behind it can only restate its own
  // headline: the model is told to invent nothing, the quality gate then scores
  // it against an empty source set, and the result is a REVIEW-queue post that
  // cost a full generation call. Skip the keyword and move to the next instead.
  if (sources.length === 0 && category.slug !== 'windows') {
    throw new Error(
      `no citable sources found for "${keyword.phrase}" — skipped before generating`,
    );
  }

  const draft = await generateDraft({ keyword, category, author, sources });
  log.info(`draft: "${draft.title}" (${draft.body.length} chars)`);

  const verified = [keyword.kbNumber, keyword.buildNumber, keyword.errorCode].filter(
    (v): v is string => Boolean(v),
  );

  const quality = await runQualityGate({
    draft,
    sources,
    verifiedIdentifiers: verified,
    keywordPhrase: keyword.phrase,
    categorySlug: category.slug as CategorySlug,
  });
  log.info(`quality: score=${quality.score}${quality.blocked ? ' BLOCKED' : ''}`);

  // Editorial shape is checked mechanically rather than trusted to the model:
  // length, an introduction, H2 sections, a conclusion, lists.
  const structure = checkStructure(draft.body);
  log.info(describeStructure(structure));

  // Prose tells (AI vocabulary, em-dash overuse, puffery). Advisory rather than
  // blocking: several flagged words are legitimate in the right context, so this
  // is recorded in the quality notes for the editor to judge.
  const style = checkStyle(`${draft.quickAnswer}\n\n${draft.body}`);
  log.info(`style: ${describeStyle(style)}`);

  const slug = await uniqueSlug(draft.slug);

  const relatedSlugs = await suggestInternalLinks({
    suggestions: draft.internalLinkSuggestions,
    categoryId: category.id,
    excludeSlug: slug,
  });

  const featuredImage = await generateFeaturedImage({
    title: draft.title,
    category: category.name,
    build: draft.affectedBuilds[0] ?? keyword.buildNumber,
    slug,
  });

  // AUTO_PUBLISH=true still requires: not blocked, score at or above the
  // threshold, a featured image, and a body that meets the editorial shape.
  // Anything else lands in REVIEW.
  const shouldPublish =
    autoPublish &&
    !quality.blocked &&
    structure.ok &&
    quality.score >= threshold &&
    Boolean(featuredImage);

  const post = await prisma.post.create({
    data: {
      title: draft.title,
      slug,
      categoryId: category.id,
      authorId: author.id,
      status: shouldPublish ? 'PUBLISHED' : 'REVIEW',
      quickAnswer: draft.quickAnswer,
      body: draft.body,
      affectedBuilds: toJson(draft.affectedBuilds),
      faq: toJson(draft.faq),
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      featuredImage,
      screenshots: toJson([]),
      sourceUrls: toJson(sources.map((s) => ({ url: s.url, title: s.title }))),
      relatedSlugs: toJson(relatedSlugs),
      qualityScore: quality.score,
      qualityNotes: [
        quality.notes,
        describeStructure(structure),
        `Style: ${describeStyle(style)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      generatedBy: 'AI',
      // testedOnBuild and lastVerifiedAt stay null until a human runs the fix.
      publishedAt: shouldPublish ? new Date() : null,
    },
  });

  const usage = readUsage();
  log.info(
    `tokens: ${usage.inputTokens.toLocaleString()} in + ` +
      `${usage.outputTokens.toLocaleString()} out across ${usage.calls} call(s)`,
  );

  await prisma.keyword.update({ where: { id: keyword.id }, data: { status: 'USED' } });

  if (shouldPublish) {
    const path = postPath({ slug, category });
    await revalidatePost(category, slug);
    await notifyPublished([path]);
    log.info(`published: ${path}`);
  } else {
    // Report the reason that actually applies. This used to print
    // "score N < threshold" for every unpublished post, which was wrong and
    // confusing whenever the real cause was something else — a post scoring 96
    // with auto-publish off was logged as "score 96 < 85".
    const reasons: string[] = [];
    if (!autoPublish) reasons.push('AUTO_PUBLISH is off');
    if (quality.blocked) reasons.push('blocked on hallucinated identifiers');
    if (!structure.ok) {
      reasons.push(
        `structure: ${structure.issues
          .filter((i) => i.blocking)
          .map((i) => i.rule)
          .join(', ')}`,
      );
    }
    if (quality.score < threshold) reasons.push(`score ${quality.score} < ${threshold}`);
    if (!featuredImage) reasons.push('no featured image');

    log.info(`review: ${reasons.join('; ') || 'held for human review'}`);
  }

  return {
    keyword: keyword.phrase,
    status: shouldPublish ? 'PUBLISHED' : 'REVIEW',
    postId: post.id,
    slug,
    score: quality.score,
    blocked: quality.blocked,
  };
}

/**
 * Purges the cached pages a new post appears on.
 *
 * `revalidatePath` only works inside a Next.js request or render context. The
 * same pipeline also runs from `npm run generate`, where there is no such
 * context and the import would throw — so it is loaded lazily and failures are
 * logged rather than raised. In the CLI case the pages refresh on their own
 * revalidate interval instead.
 */
async function revalidatePost(category: CategoryRef & { parent?: { slug: string } | null }, slug: string) {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    if (category.parent) revalidatePath(`/${category.parent.slug}`);
    revalidatePath(categoryPath(category));
    revalidatePath(postPath({ slug, category }));
    revalidatePath('/sitemap.xml');
  } catch {
    log.info('revalidate: skipped (no Next.js request context — CLI run)');
  }
}

/** Slugs are unique in the schema; append -2, -3… rather than failing the run. */
/**
 * Exported so the admin's create-post action uses the same collision rule the
 * pipeline does, rather than a second implementation that could disagree.
 */
export async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'windows-fix';
  let candidate = root;
  let n = 1;
  // Bounded: 50 collisions on one slug means something is wrong upstream.
  while (n < 50) {
    const clash = await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  throw new Error(`Could not find a free slug for "${root}".`);
}
