'use server';

import { revalidatePath } from 'next/cache';
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
import { runPipeline, type PipelineRunResult } from '@/pipeline/run';

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

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['QUEUED', 'USED', 'SKIPPED'].includes(status)) return;
  await prisma.keyword
    .update({ where: { id }, data: { status: status as 'QUEUED' | 'USED' | 'SKIPPED' } })
    .catch(() => undefined);
  revalidatePath('/admin/keywords');
}

export async function deleteKeyword(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.keyword.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin/keywords');
}

/* ---------------------------------------------------------------- settings */

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  const result = await runPipeline();
  revalidatePath('/admin');
  revalidatePath('/admin/posts');
  revalidatePath('/');
  return result;
}
