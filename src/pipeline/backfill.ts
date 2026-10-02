import { z } from 'zod';

import { prisma } from '@/lib/db';
import { generateJson } from '@/lib/ai';
import { getSetting, setSetting } from '@/lib/settings';
import { HOUSE_BYLINES, HOUSE_SLUGS, fixedBylineFor } from '@/lib/bylines';
import { assignAuthor } from '@/pipeline/select';
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
 * Writes the agreed running configuration in one go.
 *
 * Six settings that only make sense together: the volume, the cap that has to
 * accommodate it, the models that make it affordable, and the prices so the
 * dashboard can show money. Set one without the others and you get either a
 * pipeline that halts at lunchtime or a bill nobody predicted.
 *
 * The numbers: one draft per category per cycle, four cycles a day, eight
 * verticals, 32 articles a day at roughly 20,000 tokens each, so a cap of
 * 700,000 leaves headroom for retries without being a blank cheque.
 *
 * The prices are the drafting model's, because drafting is where the spend is.
 * The review and metadata calls are cheaper, so the dashboard's figure reads
 * slightly high, an estimate that errs upward is the safe direction for a
 * number you are using to decide whether to keep going.
 */
export async function applyRunningPlan(): Promise<BackfillResult> {
  const plan: Array<[Parameters<typeof setSetting>[0], string]> = [
    ['POSTS_PER_CATEGORY', '1'],
    ['DAILY_TOKEN_BUDGET', '700000'],
    ['AI_MODEL_DRAFT', 'gpt-5.4-mini'],
    ['AI_MODEL_REVIEW', 'gpt-5.4-mini'],
    ['AI_MODEL_META', 'gpt-5.4-nano'],
    // Left empty on purpose: the owner asked for tokens, not a currency
    // estimate. `estimateCost` renders nothing rather than a zero when this is
    // blank, which is the right behaviour, "$0.00 spent" reads as a fact.
    ['AI_TOKEN_PRICES', ''],
  ];

  const applied: string[] = [];
  for (const [key, value] of plan) {
    await setSetting(key, value);
    applied.push(`${key}=${value}`);
  }

  log.info(`backfill: applied running plan, ${applied.join(', ')}`);
  return { examined: plan.length, changed: plan.length, skipped: applied };
}

/**
 * Create or update the named house bylines, and hand the sections over to them.
 *
 * Idempotent: a rerun refreshes the fields that decide whether a byline works
 * and whether it is honest, name, roles, bio, focus, and creates whatever is
 * missing. Nothing is deleted. The pre-pivot persona rows still own the back
 * catalogue and must keep owning it: re-attributing those articles to a real
 * person who had nothing to do with them is the one move this codebase will not
 * make. They simply stop appearing on the masthead.
 *
 * It also clears AI_AUTHOR_SLUG. That setting pins every generated post to a
 * single name, which would silently override the per-section bylines this is
 * putting in place.
 */
export async function seedHouseBylines(): Promise<BackfillResult> {
  const skipped: string[] = [];
  let changed = 0;

  for (const person of HOUSE_BYLINES) {
    const existing = await prisma.author.findUnique({ where: { slug: person.slug } });

    const data = {
      name: person.name,
      bio: person.bio,
      categoryFocus: JSON.stringify(person.focus),
      isGuest: false,
      stylePrompt:
        'Write plainly for a general reader. Lead with what happened and why it matters to ' +
        'them, then the detail. Short paragraphs. Attribute every figure, date and quote to ' +
        'the source it came from. No hype, no filler, and never pad to reach a length.',
    };

    await prisma.author.upsert({
      where: { slug: person.slug },
      update: data,
      create: { slug: person.slug, avatar: '', ...data },
    });
    changed += 1;
    if (!existing) skipped.push(`${person.slug}: created`);
  }

  /*
   * Write the empty value, rather than only clearing a row that exists.
   *
   * The previous version checked for a row and reported nothing when it found
   * none. But `getSetting` falls back to SETTING_DEFAULTS, which named a slug
   * here, so "no row" meant the pin was *on* while the task meant to turn it
   * off concluded there was nothing to do. Sport, health and education were
   * bylined to the founder for a whole cycle because of it. Writing the row
   * makes the state explicit either way.
   */
  const pinned = await prisma.setting.findUnique({ where: { key: 'AI_AUTHOR_SLUG' } });
  await setSetting('AI_AUTHOR_SLUG', '');
  skipped.push(
    pinned?.value
      ? `AI_AUTHOR_SLUG was "${pinned.value}", cleared; the section map decides now`
      : 'AI_AUTHOR_SLUG written empty; the section map decides now',
  );

  log.info(`backfill: ${changed} house byline(s) written`);
  return { examined: HOUSE_BYLINES.length, changed, skipped };
}

/**
 * Re-byline drafts that the pin sent to the wrong person.
 *
 * Only drafts. A published article keeps the name it went out under, for the
 * same reason the back catalogue was never re-attributed: a byline is a claim
 * about who stands behind the work, and quietly swapping one after publication
 * is not a correction, it is a rewrite of the record.
 *
 * A draft is left alone unless its current byline is one the rules could not
 * have produced: either the section has a standing byline and this is not it,
 * or the author is not eligible for the section at all. Anything the rotation
 * could legitimately have chosen stays as it is.
 */
export async function reassignDraftBylines(): Promise<BackfillResult> {
  const drafts = await prisma.post.findMany({
    where: { status: { in: ['REVIEW', 'DRAFT'] } },
    include: { category: true, author: true },
    orderBy: { createdAt: 'asc' },
  });

  const skipped: string[] = [];
  let changed = 0;
  let previousAuthorId: string | null = null;

  for (const post of drafts) {
    const slug = post.category.slug;
    const standing = fixedBylineFor(slug);
    const eligible = parseJson(post.author.categoryFocus, StringArray, []).includes(slug);

    // A byline off the masthead is wrong whatever its focus says: the personas
    // still carry an old categoryFocus, which is how one of them was handed a
    // new article by the rotation.
    const onMasthead = HOUSE_SLUGS.includes(post.author.slug);
    const wrong = !onMasthead || (standing ? post.author.slug !== standing : !eligible);
    if (!wrong) {
      skipped.push(`${post.slug}: ${post.author.name} is a valid byline for ${slug}`);
      previousAuthorId = post.authorId;
      continue;
    }

    const author = await assignAuthor(slug, previousAuthorId);
    if (!author || author.id === post.authorId) {
      skipped.push(`${post.slug}: no better byline available for ${slug}`);
      continue;
    }

    await prisma.post.update({ where: { id: post.id }, data: { authorId: author.id } });
    skipped.push(`${post.slug}: ${post.author.name} -> ${author.name} (${slug})`);
    previousAuthorId = author.id;
    changed += 1;
  }

  log.info(`backfill: re-bylined ${changed} draft(s)`);
  return { examined: drafts.length, changed, skipped };
}

/**
 * Announce every published URL to IndexNow and ping the sitemap.
 *
 * New posts already do this on publish. Everything published before that was
 * wired, or while the key setting was empty, was never announced at all.
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
 * the article, see the note on `regradePost`. Sources are re-fetched because a
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
        // Naming a page is mechanical, the smallest configured model will do.
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
