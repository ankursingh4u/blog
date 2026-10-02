import { prisma } from '@/lib/db';
import { asBool, asInt, getSettings, setSetting } from '@/lib/settings';
import { GenerationError, hasApiKey, readUsage, resetUsage } from '@/lib/ai';
import { EMPTY_CREDIT, ImageCreditSchema, parseJson, toJson } from '@/lib/json';
import { slugify } from '@/lib/utils';
import { notifyPublished } from '@/lib/indexing';
import { checkStructure, describeStructure } from '@/pipeline/structure';
import { checkPadding, describePadding } from '@/pipeline/padding';
import { checkStyle, describeStyle } from '@/pipeline/style';
import { categoryPath, postPath, type CategoryRef } from '@/lib/urls';

import { log, type LogLine } from '@/pipeline/log';
import { decode, type CategorySlug } from '@/pipeline/parser';

/**
 * Candidates fetched per post wanted, to absorb keywords that get skipped.
 *
 * Raised from 6 when the search-demand check landed. Two filters can now drop a
 * keyword before it costs anything - no citable source, and nobody searching
 * the subject - and a run that skips its whole pool produces nothing at all.
 * Candidates are a database read; skipping is free compared with writing an
 * article nobody will look for.
 */
const KEYWORD_OVERSELECT = 10;

/**
 * Words a headline uses and a search box never does.
 *
 * Autocomplete completes what somebody is part-way through typing. Nobody types
 * "IHG revamps its credit card lineup" or "U.S. FDA approves AbbVie drug", and
 * both return nothing at all; strip the reporting verb and the grammar around
 * it and "IHG credit card" returns the queries that matter. Verified against
 * live headlines rather than assumed.
 */
const HEADLINE_NOISE = new Set([
  'a', 'an', 'the', 'its', 'his', 'her', 'their', 'our', 'this', 'that', 'these',
  'and', 'or', 'but', 'with', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'from',
  'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'he', 'she', 'they',
  'after', 'before', 'over', 'into', 'amid', 'ahead', 'says', 'said',
  'revamps', 'launches', 'launch', 'announces', 'approves', 'unveils', 'reveals',
  'adds', 'gets', 'brings', 'confirms', 'reports', 'plans', 'sets', 'opens',
  'raises', 'cuts', 'hits', 'wins', 'loses', 'signs', 'names', 'calls', 'urges',
  'warns', 'backs', 'denies', 'faces', 'seeks', 'eyes', 'weighs', 'debuts',
  'premieres', 'returns', 'promises', 'examine', 'closes', 'rises', 'falls',
]);

/**
 * Candidate seeds, most specific first. The first that answers is used.
 *
 * Order is the whole design here. A two-word stub almost always returns
 * something, and what it returns is almost always useless: "US FDA" gives back
 * "us fda full form" for an article about a Parkinson's drug. So the narrow
 * seeds are tried first and the stub is the last resort, with the distinctive
 * nouns tried in between for headlines that lead with an agency or a wire verb.
 *
 * Possessives are stripped rather than kept. "AbbVie's" became "AbbVies" and
 * matched nothing at all, which is how the FDA headline fell through to the
 * useless stub in testing.
 */
export function searchSeeds(phrase: string): string[] {
  const words = phrase
    .replace(/[:,–—|?].*$/, '')
    .replace(/['’]s\b/g, '')
    .split(/\s+/)
    .map((w) => w.replace(/[^\w-]/g, ''))
    .filter(Boolean)
    .filter((w) => !HEADLINE_NOISE.has(w.toLowerCase()));

  const longest = [...words].sort((a, b) => b.length - a.length).slice(0, 2);

  const seeds = [
    words.slice(0, 4),
    words.slice(0, 3),
    words.slice(-3),
    longest,
    words.slice(0, 2),
  ]
    .map((parts) => parts.join(' ').trim())
    .filter((s) => s.length > 2);

  return [...new Set(seeds)];
}

/**
 * The first seed that autocomplete will actually answer.
 *
 * Fails soft to an empty list: the prompt then tells the model to work the
 * queries out for itself, which is worse than real data but better than
 * blocking a draft on a flaky third-party endpoint.
 */
async function searchesFor(phrase: string): Promise<string[]> {
  for (const seed of searchSeeds(phrase)) {
    const suggestions = await fetchGoogleSuggest(seed);
    if (suggestions.length > 0) return suggestions.slice(0, 8);
  }
  return [];
}
import { ingest } from '@/pipeline/ingest';
import { fetchGoogleSuggest } from '@/pipeline/discovery';
import { assignAuthor, selectKeywords } from '@/pipeline/select';
import { research } from '@/pipeline/research';
import { generateDraft } from '@/pipeline/generate';
import { runQualityGate } from '@/pipeline/quality-gate';
import { suggestInternalLinks } from '@/pipeline/internal-links';
import { generateFeaturedImage } from '@/pipeline/featured-image';
import { attachCoverPhoto, usedKeysFromCredits } from '@/pipeline/cover-photo';
import { describeBudget, readBudget, recordUsage } from '@/pipeline/budget';
import { notifyDraft } from '@/lib/telegram';
import { absoluteUrl } from '@/lib/site';

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
  /** True when the run stopped early because the daily token cap was reached. */
  budgetStopped: boolean;
  outcomes: PipelineOutcome[];
  logs: LogLine[];
}

export async function runPipeline(
  options: {
    skipIngest?: boolean;
    limit?: number;
    excludeCategorySlugs?: string[];
    /**
     * Push each draft to Telegram as it is produced. True for a one-off run,
     * where the draft is the only thing to look at.
     *
     * A cycle sets this false: it produces sixteen drafts and sending sixteen
     * messages at once is the thing the review queue exists to avoid. It takes
     * over the sending itself, one draft at a time. See `runCycle`.
     */
    notify?: boolean;
    /**
     * Bylines already used in the current cycle.
     *
     * A run on its own only avoids repeating the previous author. Across eight
     * category runs that let one name take two drafts out of eight, which
     * reads as a newsroom of two people rather than the masthead it has.
     */
    usedAuthorIds?: string[];
  } = {},
): Promise<PipelineRunResult> {
  const startedAt = new Date().toISOString();
  log.reset();

  if (!hasApiKey()) {
    log.error('OPENAI_API_KEY is not set, the pipeline cannot generate anything.');
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      ingested: 0,
      attempted: 0,
      published: 0,
      inReview: 0,
      failed: 0,
      budgetStopped: false,
      outcomes: [],
      logs: log.recent(),
    };
  }

  const settings = await getSettings();
  const postsPerRun = Math.min(options.limit ?? asInt(settings.POSTS_PER_DAY, 2), 3);
  const autoPublish = asBool(settings.AUTO_PUBLISH);
  const threshold = asInt(settings.QUALITY_THRESHOLD, 85);
  const requireDemand = asBool(settings.REQUIRE_SEARCH_DEMAND);

  log.info(
    `run: posts=${postsPerRun} autoPublish=${autoPublish} threshold=${threshold} ` +
      `requireSearchDemand=${requireDemand}`,
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
  /**
   * Photographs already on the site, so this run cannot reissue one.
   *
   * Loaded once and mutated as posts are produced, which also covers reuse
   * *within* the run, two sports stories on the same morning would otherwise
   * both match the football rule and both take the top-ranked stadium.
   */
  const storedCredits = await prisma.post.findMany({
    where: { NOT: { imageCredit: '' } },
    select: { imageCredit: true },
  });
  const usedPhotoKeys = usedKeysFromCredits(
    storedCredits.map((post) => parseJson(post.imageCredit, ImageCreditSchema, EMPTY_CREDIT)),
  );

  const outcomes: PipelineOutcome[] = [];
  let previousAuthorId: string | null = null;
  let produced = 0;
  let attempted = 0;

  let budgetStopped = false;

  for (const keyword of candidates) {
    if (produced >= postsPerRun) break;

    /**
     * The spend guard, checked before each post rather than once per run.
     *
     * A run is several articles and the tally only moves after each one
     * finishes, so checking once at the top would let a run that starts just
     * under the ceiling finish well over it. Stopping here means the cap is
     * exceeded by at most the article in flight.
     */
    const budget = await readBudget();
    if (budget.exhausted) {
      budgetStopped = true;
      log.warn(
        `run: stopping, daily token cap reached (${describeBudget(budget)}). ` +
          'Raise DAILY_TOKEN_BUDGET in /admin/settings or wait for tomorrow.',
      );
      break;
    }

    attempted += 1;

    try {
      const outcome = await produceOne({
        keywordId: keyword.id,
        autoPublish,
        threshold,
        previousAuthorId,
        usedPhotoKeys,
        usedAuthorIds: options.usedAuthorIds,
        notify: options.notify ?? true,
        requireDemand,
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
      log.error(`"${keyword.phrase}" failed, ${message}`);
      await prisma.keyword
        .update({ where: { id: keyword.id }, data: { status: 'SKIPPED' } })
        .catch(() => undefined);
      outcomes.push({ keyword: keyword.phrase, status: 'FAILED', error: message });
    }
  }

  if (produced < postsPerRun) {
    log.warn(
      `run: wanted ${postsPerRun} post(s) but produced ${produced} after trying ` +
        `${attempted} keyword(s), most had no citable source.`,
    );
  }

  const published = outcomes.filter((o) => o.status === 'PUBLISHED').length;
  const inReview = outcomes.filter((o) => o.status === 'REVIEW').length;
  const failed = outcomes.filter((o) => o.status === 'FAILED').length;

  log.info(`run: ${published} published, ${inReview} in review, ${failed} failed`);

  const result: PipelineRunResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    ingested,
    attempted,
    published,
    inReview,
    failed,
    budgetStopped,
    outcomes,
    logs: log.recent(),
  };

  /**
   * Persist the summary so an overnight run is inspectable in the morning.
   *
   * Logs were in-memory only, which is fine for the "Run now" button, the
   * result is on screen, and useless for a scheduled run, where nobody is
   * watching and the process exits. The logs are dropped from what is stored;
   * they can run to hundreds of lines and the counts are what answer "did last
   * night work?".
   */
  await setSetting(
    'LAST_RUN',
    JSON.stringify({ ...result, logs: undefined, outcomes: outcomes.slice(0, 10) }),
  ).catch(() => log.warn('run: could not persist the run summary'));

  return result;
}

async function produceOne({
  keywordId,
  autoPublish,
  threshold,
  previousAuthorId,
  usedPhotoKeys,
  usedAuthorIds = [],
  notify = true,
  requireDemand = true,
}: {
  keywordId: string;
  autoPublish: boolean;
  threshold: number;
  previousAuthorId: string | null;
  /** Mutated as photographs are taken, so later posts in the run see them. */
  usedPhotoKeys: Set<string>;
  /** Bylines already used this cycle, so one cycle spreads across the masthead. */
  usedAuthorIds?: string[];
  /** False when a cycle will do the sending itself, one draft at a time. */
  notify?: boolean;
  /** Skip the keyword when autocomplete shows nobody searches for it. */
  requireDemand?: boolean;
}): Promise<PipelineOutcome> {
  const stored = await prisma.keyword.findUniqueOrThrow({ where: { id: keywordId } });

  /**
   * Re-decode the phrase on the way out, not just on the way in.
   *
   * `decode` only learned numeric entities and mojibake repair on 2026-09-30,
   * and the keyword table already held hundreds of rows ingested before that -
   * "Can &#8216;eSUV&#8217; e-bikes…", "GM canâ€™t…". The phrase becomes the
   * target keyword and then the H1, so publishing one of those puts the raw
   * entity in front of a reader. Repairing here fixes the existing backlog
   * without a migration, and is a no-op for anything already clean.
   */
  const keyword = { ...stored, phrase: decode(stored.phrase) };
  log.info(`--- "${keyword.phrase}"`);

  const categoryInclude = { parent: { select: { name: true, slug: true } } };
  const category = keyword.categoryId
    ? await prisma.category.findUnique({
        where: { id: keyword.categoryId },
        include: categoryInclude,
      })
    : await prisma.category.findFirst({ orderBy: { position: 'asc' }, include: categoryInclude });
  if (!category) throw new Error('No category available, run the seed first.');

  const author = await assignAuthor(category.slug, previousAuthorId, usedAuthorIds);
  if (!author) throw new Error('No authors exist, run the seed first.');
  log.info(`author: ${author.name}`);

  // Token accounting is per post, so the tally starts clean here rather than at
  // the top of the run, a keyword skipped for want of sources costs nothing and
  // should not be averaged in.
  resetUsage();

  /**
   * Does anybody search for this? Asked before anything is paid for.
   *
   * Autocomplete is a demand signal as much as a phrasing aid: Google only
   * suggests what people type. A subject that returns nothing from every seed
   * is a subject nobody looks for, and writing it produces a page that can be
   * perfectly sourced, perfectly structured, and read by no one.
   *
   * This is not hypothetical. "Japanese money moving home could impact global
   * risk assets" is fund-manager commentary; autocomplete had nothing for it,
   * the model had no query to aim at, and the result scored 63 and reads like
   * the press release it came from. It cost a full generation call to learn
   * that. This check costs one free HTTP request.
   *
   * Troubleshooting is exempt: somebody hunting an error code is searching the
   * code, which autocomplete rarely carries, and those pages answer a real need
   * regardless. REQUIRE_SEARCH_DEMAND turns the whole thing off.
   */
  const searches = await searchesFor(keyword.phrase);
  if (searches.length > 0) {
    log.info(`searches: ${searches.slice(0, 5).join(' | ')}`);
  } else if (requireDemand && category.slug !== 'windows') {
    throw new Error(
      `no search demand for "${keyword.phrase}" (autocomplete returned nothing for any seed), ` +
        'skipped before generating',
    );
  } else {
    log.warn(`searches: none found for "${keyword.phrase}", writing it anyway`);
  }

  const sources = await research(keyword, category.slug as CategorySlug);

  // Generating without sources is not worth paying for outside troubleshooting.
  // A Windows guide still has Microsoft's documentation to fall back on, but a
  // general-interest draft with nothing behind it can only restate its own
  // headline: the model is told to invent nothing, the quality gate then scores
  // it against an empty source set, and the result is a REVIEW-queue post that
  // cost a full generation call. Skip the keyword and move to the next instead.
  if (sources.length === 0 && category.slug !== 'windows') {
    throw new Error(
      `no citable sources found for "${keyword.phrase}", skipped before generating`,
    );
  }

  const draft = await generateDraft({ keyword, category, author, sources, searches });
  log.info(`draft: "${draft.title}" (${draft.body.length} chars)`);

  const verified = [keyword.kbNumber, keyword.buildNumber, keyword.errorCode].filter(
    (v): v is string => Boolean(v),
  );

  /**
   * The free checks run first, before anything is paid for.
   *
   * These are string functions over the draft we already have; the quality gate
   * below is a second API call. Running the gate first meant a draft that the
   * `research-meta` rule throws away, and that rule hit 24 of the first 34
   * articles, was scored by a model, paid for, and then discarded unread.
   * Nothing is skipped by this reordering, it only stops buying a verdict on an
   * article that is about to be thrown out.
   */

  // Editorial shape is checked mechanically rather than trusted to the model:
  // length, an introduction, H2 sections, a conclusion, lists.
  const structure = checkStructure(draft.body);
  log.info(describeStructure(structure));

  // The other half of the 1500-word floor. Length alone is satisfiable by
  // restating the same point under a new heading, so repetition is measured
  // separately and blocks auto-publish the way a structural failure does.
  const padding = checkPadding(draft.body);
  log.info(describePadding(padding));

  // Prose tells (AI vocabulary, em-dash overuse, puffery). Advisory rather than
  // blocking: several flagged words are legitimate in the right context, so this
  // is recorded in the quality notes for the editor to judge.
  const style = checkStyle(`${draft.quickAnswer}\n\n${draft.body}`);
  log.info(`style: ${describeStyle(style)}`);

  /**
   * `research-meta` is the exception: it blocks.
   *
   * Every other style rule flags a word that can be legitimate in context. This
   * one flags the draft talking about its own research, "the supplied sources",
   * "not confirmed in the supplied material", and there is no context in which
   * that belongs in a published article. The reader cannot see the research and
   * does not know it exists.
   *
   * It is not a hypothetical: 24 of the first 34 articles shipped with it, 22 of
   * them in the Quick answer box, two in the title. Left advisory, it was
   * recorded in the notes and published anyway.
   */
  const researchMeta = style.hits.find((h) => h.rule === 'research-meta');
  if (researchMeta) {
    throw new GenerationError(
      `Draft refers to its own research material (${researchMeta.matches.slice(0, 3).join(', ')}). ` +
        'Write about the subject, not about what the sources did or did not contain.',
    );
  }

  /**
   * The paid check, on a draft that has survived the free ones.
   *
   * Not skipped when structure or padding flag: the identifier audit inside it
   * is local string matching against the sources, it is what blocks a
   * hallucinated figure from publishing, and it must run on everything.
   */
  const quality = await runQualityGate({
    draft,
    sources,
    verifiedIdentifiers: verified,
    keywordPhrase: keyword.phrase,
    categorySlug: category.slug as CategorySlug,
  });
  log.info(`quality: score=${quality.score}${quality.blocked ? ' BLOCKED' : ''}`);

  const slug = await uniqueSlug(draft.slug);

  const relatedSlugs = await suggestInternalLinks({
    suggestions: draft.internalLinkSuggestions,
    categoryId: category.id,
    excludeSlug: slug,
  });

  /**
   * A photograph if one can be found, the branded card otherwise.
   *
   * The photo is tried first so the OG render is skipped entirely when it
   * succeeds, `featuredImage` holds one or the other, and `imageCredit` is what
   * tells them apart downstream (`coverPhoto()` in components/ui/cover-art.tsx).
   *
   * `usedPhotoKeys` is seeded from every credit already stored, so a run cannot
   * hand out a picture an earlier run used. Two football stories getting the
   * same stadium is the difference between looking automated and looking broken.
   */
  const photo = await attachCoverPhoto({
    title: draft.title,
    categorySlug: category.slug,
    slug,
    used: usedPhotoKeys,
  });

  const featuredImage =
    photo?.url ??
    (await generateFeaturedImage({
      title: draft.title,
      category: category.name,
      build: draft.affectedBuilds[0] ?? keyword.buildNumber,
      slug,
    }));

  // AUTO_PUBLISH=true still requires: not blocked, score at or above the
  // threshold, a featured image, and a body that meets the editorial shape.
  // Anything else lands in REVIEW.
  const shouldPublish =
    autoPublish &&
    !quality.blocked &&
    structure.ok &&
    padding.ok &&
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
      // Empty for the branded card, which is ours and needs no attribution. A
      // photograph without its credit is an infringing copy, so the two are
      // written in the same statement rather than in two places that could
      // disagree.
      imageCredit: photo ? toJson(photo.credit) : '',
      screenshots: toJson([]),
      sourceUrls: toJson(sources.map((s) => ({ url: s.url, title: s.title }))),
      relatedSlugs: toJson(relatedSlugs),
      qualityScore: quality.score,
      qualityNotes: [
        quality.notes,
        describeStructure(structure),
        describePadding(padding),
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
  // Added to the daily tally before the post is even a success, because the
  // tokens were spent either way, a cap that only counted articles that
  // shipped would be no cap at all on a day when everything failed the gates.
  const today = await recordUsage(usage);
  log.info(
    `tokens: ${usage.inputTokens.toLocaleString()} in + ` +
      `${usage.outputTokens.toLocaleString()} out across ${usage.calls} call(s) ` +
      `(${(today.inputTokens + today.outputTokens).toLocaleString()} today)`,
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
    // confusing whenever the real cause was something else, a post scoring 96
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
    if (!padding.ok) {
      reasons.push(
        `padding: ${padding.issues
          .filter((i) => i.blocking)
          .map((i) => i.rule)
          .join(', ')}`,
      );
    }
    if (quality.score < threshold) reasons.push(`score ${quality.score} < ${threshold}`);
    if (!featuredImage) reasons.push('no featured image');

    log.info(`review: ${reasons.join('; ') || 'held for human review'}`);

    /**
     * Push the draft to Telegram with Approve / Reject attached.
     *
     * Only for the review branch: an auto-published article is already live and
     * there is nothing left to decide.
     *
     * Failure is swallowed on purpose. The article exists and is queued; a
     * Telegram outage must not turn a successful generation into a failed one,
     * and the /admin queue remains the authoritative place to act either way.
     */
    try {
      if (!notify) log.info('telegram: held for the review queue');
      const sent =
        notify &&
        (await notifyDraft({
        postId: post.id,
        title: draft.title,
        category: category.name,
        author: author.name,
        wordCount: structure.wordCount,
        score: quality.score,
        adminUrl: absoluteUrl(`/admin/posts/${post.id}`),
        imageUrl: featuredImage ? absoluteUrl(featuredImage) : null,
          verdict: [describeStructure(structure), describePadding(padding)]
            .join(' ')
            .slice(0, 300),
        }));
      if (sent) log.info('telegram: sent for review');
    } catch (error) {
      log.warn(
        `telegram: could not notify, ${error instanceof Error ? error.message : error}`,
      );
    }
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
 * context and the import would throw, so it is loaded lazily and failures are
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
    log.info('revalidate: skipped (no Next.js request context, CLI run)');
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
