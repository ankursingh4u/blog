'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { PostStatus } from '@prisma/client';

import { prisma } from '@/lib/db';
import { toJson } from '@/lib/json';
import { slugify } from '@/lib/utils';
import { notifyPublished } from '@/lib/indexing';
import { storage, UploadError, MAX_UPLOAD_BYTES } from '@/lib/storage';
import { setSetting, SETTING_DEFAULTS, type SettingKey } from '@/lib/settings';
import { generateText } from '@/lib/ai';
import { categoryPath, postPath } from '@/lib/urls';
import { extractSection } from '@/lib/admin/section';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { runPipeline, uniqueSlug, type PipelineRunResult } from '@/pipeline/run';
import { assignAuthor } from '@/pipeline/select';
import { research } from '@/pipeline/research';
import { generateFeaturedImage } from '@/pipeline/featured-image';
import { searchImages, storeImage, type ImageCandidate } from '@/lib/images';
import type { CategorySlug } from '@/pipeline/parser';

/**
 * Admin server actions.
 *
 * Everything that writes lives here, so when auth lands a single wrapper around
 * this module covers every mutation — no admin route writes to the database
 * directly. All input is validated with Zod: a server action is a public HTTP
 * endpoint whether or not a form points at it.
 */

export interface ActionState {
  ok: boolean;
  message: string;
  /** Field-level errors keyed by input name. */
  errors?: Record<string, string>;
  /** Set by the upload action. */
  url?: string;
}

/**
 * Refuses anything that is not a signed-in admin.
 *
 * Middleware already gates /admin, and every action here is invoked from a page
 * under it, so this is the second of two locks. It is worth having: a server
 * action is a public HTTP endpoint that happens to be reachable by anyone who
 * knows its id, and a mutation whose only protection is a route matcher is one
 * config edit away from being open. Called first in every function that writes.
 */
async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!(await verifySessionToken(store.get(SESSION_COOKIE)?.value))) {
    throw new Error('Not signed in.');
  }
}

const OK = (message: string, extra: Partial<ActionState> = {}): ActionState => ({
  ok: true,
  message,
  ...extra,
});
const FAIL = (message: string, errors?: Record<string, string>): ActionState => ({
  ok: false,
  message,
  errors,
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------- posts */

const FaqInput = z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) }));
const ScreenshotInput = z.array(z.object({ url: z.string().min(1), alt: z.string().default('') }));

const PostInput = z.object({
  id: z.string().min(1),
  title: z.string().min(10, 'Title must be at least 10 characters.').max(140),
  slug: z.string().min(3).max(90),
  categoryId: z.string().min(1, 'Pick a category.'),
  authorId: z.string().min(1, 'Pick an author.'),
  quickAnswer: z.string().min(40, 'The quick answer needs to actually answer the question.'),
  body: z.string().min(200, 'The body is too short to be a guide.'),
  metaTitle: z.string().min(10).max(70, 'Meta titles over 70 characters get truncated by Google.'),
  metaDescription: z
    .string()
    .min(50)
    .max(170, 'Meta descriptions over 170 characters get truncated by Google.'),
  affectedBuilds: z.string().default(''),
  testedOnBuild: z.string().default(''),
  featuredImage: z.string().default(''),
  faqJson: z.string().default('[]'),
  screenshotsJson: z.string().default('[]'),
  relatedSlugsJson: z.string().default('[]'),
});

const CreatePostInput = z.object({
  /** Optional: start from a topic the Google News ingest already found. */
  keywordId: z.string().optional(),
  title: z.string().min(10, 'Give it a working title of at least 10 characters.').max(140),
  categoryId: z.string().min(1, 'Pick a section.'),
});

/**
 * Creates an empty article for a human to write.
 *
 * Nothing here calls a language model. Discovery is RSS, the sources are
 * fetched HTML, and the cover is rendered locally by /api/og — so a
 * hand-written article costs nothing to produce, which is the entire point of
 * having this alongside the pipeline.
 *
 * Starting from a queued keyword carries the work the ingest already did:
 * the section, and the citable sources found for that story. Those are the
 * expensive part to reproduce by hand, and having them attached before you
 * start is what keeps a hand-written piece to the same sourcing standard as a
 * generated one.
 */
export async function createPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = CreatePostInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAIL('Fix the highlighted fields.', fieldErrors(parsed.error));
  const { keywordId, title, categoryId } = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { parent: { select: { name: true, slug: true } } },
  });
  if (!category) return FAIL('That section no longer exists.', { categoryId: 'Unknown section.' });

  const author = await assignAuthor(category.slug, null);
  if (!author) return FAIL('No authors exist — run the seed first.');

  const slug = await uniqueSlug(slugify(title));

  // Pull the sources the ingest already found for this story. Free — RSS and
  // plain HTTP — but slow enough to be worth doing once, here, rather than
  // making the writer wait for it later.
  let sources: Array<{ url: string; title: string }> = [];
  if (keywordId) {
    const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
    if (keyword) {
      try {
        const found = await research(keyword, category.slug as CategorySlug);
        sources = found.map((s) => ({ url: s.url, title: s.title }));
      } catch {
        // A story with no reachable source is still worth writing by hand —
        // the writer supplies their own. Do not block creation on it.
      }
      await prisma.keyword.update({ where: { id: keyword.id }, data: { status: 'USED' } });
    }
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      categoryId: category.id,
      authorId: author.id,
      status: 'DRAFT',
      quickAnswer: '',
      body: '',
      affectedBuilds: toJson([]),
      faq: toJson([]),
      metaTitle: title.slice(0, 70),
      metaDescription: '',
      screenshots: toJson([]),
      sourceUrls: toJson(sources),
      relatedSlugs: toJson([]),
      // HUMAN is what separates a hand-written article from pipeline output —
      // it is also what the quality gate's absence is explained by, so nothing
      // downstream mistakes an unscored draft for a failed one.
      generatedBy: 'HUMAN',
      qualityNotes: 'Written by hand in the admin. No AI generation or quality gate ran on it.',
    },
  });

  // Free: /api/og renders locally. Doing it now means the draft can be
  // published later without a separate step, since publishing requires a cover.
  try {
    const image = await generateFeaturedImage({
      title,
      category: category.name,
      slug,
    });
    if (image) {
      await prisma.post.update({ where: { id: post.id }, data: { featuredImage: image } });
    }
  } catch {
    // The editor has an uploader and a regenerate script; not worth failing on.
  }

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}

/* ------------------------------------------------------------ cover images */

const ImageSearchInput = z.object({ query: z.string().min(2).max(120) });

export interface ImageSearchState {
  ok: boolean;
  message: string;
  results?: ImageCandidate[];
}

/** Searches Openverse for an openly-licensed cover. No key, no cost. */
export async function searchCoverImages(
  _prev: ImageSearchState,
  formData: FormData,
): Promise<ImageSearchState> {
  await requireAdmin();
  const parsed = ImageSearchInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Type at least two characters to search.' };

  try {
    const results = await searchImages(parsed.data.query);
    return {
      ok: true,
      message: results.length ? '' : 'Nothing matched. Try a broader phrase.',
      results,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Image search failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

const ApplyImageInput = z.object({
  id: z.string().min(1),
  candidateJson: z.string().min(2),
});

/**
 * Stores a chosen image locally and attaches it, with its attribution, to a
 * post.
 *
 * The credit is written in the same operation as the image. Storing one without
 * the other would leave a CC-BY photo on the site with no way to render the
 * credit its licence requires.
 */
export async function applyCoverImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = ApplyImageInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAIL('Could not read the selected image.');

  const post = await prisma.post.findUnique({
    where: { id: parsed.data.id },
    select: { slug: true },
  });
  if (!post) return FAIL('That post no longer exists.');

  let candidate: ImageCandidate;
  try {
    candidate = JSON.parse(parsed.data.candidateJson) as ImageCandidate;
  } catch {
    return FAIL('Could not read the selected image.');
  }

  try {
    const stored = await storeImage(candidate, post.slug);
    await prisma.post.update({
      where: { id: parsed.data.id },
      data: { featuredImage: stored.url, imageCredit: toJson(stored.credit) },
    });
    revalidatePath(`/admin/posts/${parsed.data.id}`);
    return OK(`Cover set. Credit: ${stored.credit.creator} (${stored.credit.license}).`);
  } catch (error) {
    return FAIL(error instanceof Error ? error.message : 'Could not store that image.');
  }
}

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = PostInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAIL('Fix the highlighted fields.', fieldErrors(parsed.error));
  const input = parsed.data;

  const slug = slugify(input.slug) || slugify(input.title);
  const clash = await prisma.post.findFirst({
    where: { slug, NOT: { id: input.id } },
    select: { id: true },
  });
  if (clash) return FAIL('Another post already uses that slug.', { slug: 'Slug is taken.' });

  let faq: unknown;
  let screenshots: unknown;
  let relatedSlugs: unknown;
  try {
    faq = FaqInput.parse(JSON.parse(input.faqJson));
    screenshots = ScreenshotInput.parse(JSON.parse(input.screenshotsJson));
    relatedSlugs = z.array(z.string()).parse(JSON.parse(input.relatedSlugsJson));
  } catch {
    return FAIL('The FAQ, screenshot or related-post data could not be read.');
  }

  const builds = input.affectedBuilds
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);

  const post = await prisma.post.update({
    where: { id: input.id },
    data: {
      title: input.title,
      slug,
      categoryId: input.categoryId,
      authorId: input.authorId,
      quickAnswer: input.quickAnswer,
      body: input.body,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      affectedBuilds: toJson(builds),
      faq: toJson(faq),
      screenshots: toJson(screenshots),
      relatedSlugs: toJson(relatedSlugs),
      featuredImage: input.featuredImage || null,
      testedOnBuild: input.testedOnBuild || null,
      // Recording a tested build is what "verified" means here, so stamp the
      // date at the same moment rather than asking the editor for both.
      lastVerifiedAt: input.testedOnBuild ? new Date() : null,
    },
    include: { category: { include: { parent: { select: { slug: true } } } } },
  });

  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${post.id}`);
  if (post.status === 'PUBLISHED') {
    revalidatePath(postPath(post));
    revalidatePath(categoryPath(post.category));
    revalidatePath('/');
  }

  return OK('Saved.');
}

const StatusInput = z.object({
  id: z.string().min(1),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']),
});

export async function setPostStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = StatusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAIL('Unknown status.');
  const { id, status } = parsed.data;

  const existing = await prisma.post.findUnique({
    where: { id },
    include: { category: { include: { parent: { select: { slug: true } } } } },
  });
  if (!existing) return FAIL('That post no longer exists.');

  // A post cannot go live without the things that make it useful and indexable.
  if (status === 'PUBLISHED') {
    const problems: string[] = [];
    if (!existing.featuredImage) problems.push('no featured image');
    if (existing.body.trim().length < 200) problems.push('body is too short');
    if (!existing.metaDescription) problems.push('no meta description');
    if (problems.length > 0) return FAIL(`Cannot publish: ${problems.join(', ')}.`);
  }

  const post = await prisma.post.update({
    where: { id },
    data: {
      status: status as PostStatus,
      // publishedAt is set once, on first publish, and kept afterwards so the
      // canonical publication date does not move when a post is edited.
      publishedAt:
        status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
    },
    include: { category: { include: { parent: { select: { slug: true } } } } },
  });

  const path = postPath(post);
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath(categoryPath(post.category));
  revalidatePath(path);
  revalidatePath('/sitemap.xml');

  if (status === 'PUBLISHED') {
    await notifyPublished([path]);
    return OK('Published.');
  }
  return OK(`Status set to ${status.toLowerCase()}.`);
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.post.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin/posts');
  revalidatePath('/admin');
  redirect('/admin/posts');
}

/* ------------------------------------------------------- regenerate section */

const RegenerateInput = z.object({
  postId: z.string().min(1),
  heading: z.string().min(1),
  instruction: z.string().default(''),
});

/**
 * Rewrites one H2 section of the body in place.
 *
 * The model sees the whole article for context but is told to return only the
 * replacement section, and the swap is done here by string surgery — so a
 * regeneration can never silently rewrite the rest of the guide.
 */
export async function regenerateSection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = RegenerateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAIL('Pick a section to regenerate.');
  const { postId, heading, instruction } = parsed.data;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: true, category: true },
  });
  if (!post) return FAIL('That post no longer exists.');

  const section = extractSection(post.body, heading);
  if (!section) return FAIL(`Could not find a section headed "${heading}".`);

  try {
    const rewritten = await generateText({
      system: [
        `You are rewriting one section of a Windows troubleshooting guide, as ${post.author.name}.`,
        `Author voice: ${post.author.stylePrompt}`,
        '',
        'Return ONLY the replacement section in markdown, starting with its "## " heading.',
        'No preamble, no explanation, no code fence around the whole thing.',
        'Do not name any KB number, build number, or error code that is not already',
        'somewhere in the article you are given.',
      ].join('\n'),
      prompt: [
        `ARTICLE TITLE: ${post.title}`,
        `QUICK ANSWER: ${post.quickAnswer}`,
        '',
        'FULL ARTICLE (for context):',
        post.body,
        '',
        'SECTION TO REWRITE:',
        section.text,
        '',
        instruction ? `EDITOR INSTRUCTION: ${instruction}` : 'Improve clarity and completeness.',
      ].join('\n'),
      maxTokens: 6000,
      effort: 'medium',
    });

    if (!rewritten.trim().startsWith('#')) {
      return FAIL('The model did not return a markdown section. Try again.');
    }

    const body =
      post.body.slice(0, section.start) + rewritten.trim() + '\n\n' + post.body.slice(section.end);

    await prisma.post.update({ where: { id: postId }, data: { body } });
    revalidatePath(`/admin/posts/${postId}`);
    return OK(`Rewrote "${heading}".`);
  } catch (error) {
    return FAIL(error instanceof Error ? error.message : 'Regeneration failed.');
  }
}

/* ------------------------------------------------------------------ upload */

export async function uploadScreenshot(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return FAIL('Choose a file first.');
  if (file.size > MAX_UPLOAD_BYTES) {
    return FAIL(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.`);
  }

  try {
    const stored = await storage.put({
      body: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      contentType: file.type,
      prefix: String(formData.get('prefix') ?? 'posts'),
    });
    return OK('Uploaded.', { url: stored.url });
  } catch (error) {
    if (error instanceof UploadError) return FAIL(error.message);
    return FAIL('Upload failed.');
  }
}

/* ----------------------------------------------------------------- authors */

const AuthorInput = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  bio: z.string().min(60, 'Give the reader a real reason to trust this byline.').max(1200),
  avatar: z.string().default(''),
  stylePrompt: z.string().min(40, 'The style prompt drives generation; make it specific.'),
  categoryFocus: z.array(z.string()).default([]),
});

export async function saveAuthor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = AuthorInput.safeParse({
    ...Object.fromEntries(formData),
    categoryFocus: formData.getAll('categoryFocus').map(String),
  });
  if (!parsed.success) return FAIL('Fix the highlighted fields.', fieldErrors(parsed.error));

  const input = parsed.data;
  const slug = slugify(input.slug) || slugify(input.name);

  const clash = await prisma.author.findFirst({
    where: { slug, ...(input.id ? { NOT: { id: input.id } } : {}) },
    select: { id: true },
  });
  if (clash) return FAIL('Another author already uses that slug.', { slug: 'Slug is taken.' });

  const data = {
    name: input.name,
    slug,
    bio: input.bio,
    avatar: input.avatar || null,
    stylePrompt: input.stylePrompt,
    categoryFocus: toJson(input.categoryFocus),
  };

  if (input.id) await prisma.author.update({ where: { id: input.id }, data });
  else await prisma.author.create({ data });

  revalidatePath('/admin/authors');
  revalidatePath(`/author/${slug}`);
  return OK('Saved.');
}

export async function deleteAuthor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  // Authors are Restrict-on-delete; a byline with posts must not vanish.
  const posts = await prisma.post.count({ where: { authorId: id } });
  if (posts === 0) await prisma.author.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin/authors');
}

/* ---------------------------------------------------------------- keywords */

const KeywordInput = z.object({
  phrase: z.string().min(8).max(140),
  categoryId: z.string().default(''),
  kbNumber: z.string().default(''),
  buildNumber: z.string().default(''),
  errorCode: z.string().default(''),
});

export async function addKeyword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = KeywordInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAIL('Fix the highlighted fields.', fieldErrors(parsed.error));
  const input = parsed.data;

  const existing = await prisma.keyword.findUnique({
    where: { phrase: input.phrase },
    select: { id: true },
  });
  if (existing) return FAIL('That phrase is already in the queue.');

  await prisma.keyword.create({
    data: {
      phrase: input.phrase,
      categoryId: input.categoryId || null,
      source: 'MANUAL',
      status: 'QUEUED',
      kbNumber: input.kbNumber || null,
      buildNumber: input.buildNumber || null,
      errorCode: input.errorCode || null,
    },
  });

  revalidatePath('/admin/keywords');
  return OK('Added to the queue.');
}

export async function setKeywordStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['QUEUED', 'USED', 'SKIPPED'].includes(status)) return;
  await prisma.keyword
    .update({ where: { id }, data: { status: status as 'QUEUED' | 'USED' | 'SKIPPED' } })
    .catch(() => undefined);
  revalidatePath('/admin/keywords');
}

export async function deleteKeyword(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.keyword.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin/keywords');
}

/* ---------------------------------------------------------------- settings */

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
  for (const key of keys) {
    const raw = formData.get(key);
    if (raw === null) continue;
    await setSetting(key, String(raw));
  }
  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
  return OK('Settings saved.');
}

/* ------------------------------------------------------------ run pipeline */

export async function triggerPipeline(): Promise<PipelineRunResult> {
  await requireAdmin();
  const result = await runPipeline();
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath('/');
  return result;
}
