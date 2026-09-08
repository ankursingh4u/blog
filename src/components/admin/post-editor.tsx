'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { CoverPicker } from '@/components/admin/cover-picker';

import {
  regenerateSection,
  savePost,
  setPostStatus,
  uploadScreenshot,
  type ActionState,
} from '@/lib/admin/actions';
import { listSections } from '@/lib/admin/section';
import {
  CharCount,
  EMPTY_STATE,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
  textareaClass,
} from '@/components/admin/form-controls';
import { StatusPill } from '@/components/admin/status-pill';
import { Badge, buttonClass } from '@/components/ui/primitives';
import { cn, slugify } from '@/lib/utils';
import type { FaqItem, Screenshot } from '@/lib/json';

export interface EditorPost {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  categoryId: string;
  /** Path of the post's category, e.g. `/tech` or `/tech/windows`. */
  categoryPath: string;
  authorId: string;
  quickAnswer: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  affectedBuilds: string[];
  testedOnBuild: string;
  featuredImage: string;
  faq: FaqItem[];
  screenshots: Screenshot[];
  relatedSlugs: string[];
  qualityScore: number | null;
  qualityNotes: string;
  sources: Array<{ url: string; title: string }>;
}

interface Option {
  id: string;
  name: string;
}

interface RelatedOption {
  slug: string;
  title: string;
  categoryName: string;
}

/**
 * The post editor.
 *
 * Structured fields are managed as React state and serialised into hidden
 * inputs on submit, so the whole form is still one server action and works
 * without JavaScript for the plain text fields. The preview pane renders the
 * markdown source rather than the sanitised HTML — it is a writing aid, and
 * fetching a server render on every keystroke would be worse than useless.
 */
export function PostEditor({
  post,
  categories,
  authors,
  relatedOptions,
}: {
  post: EditorPost;
  categories: Option[];
  authors: Option[];
  relatedOptions: RelatedOption[];
}) {
  const [saveState, saveAction] = useActionState<ActionState, FormData>(savePost, EMPTY_STATE);
  const [statusState, statusAction] = useActionState<ActionState, FormData>(
    setPostStatus,
    EMPTY_STATE,
  );

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [quickAnswer, setQuickAnswer] = useState(post.quickAnswer);
  const [body, setBody] = useState(post.body);
  const [metaTitle, setMetaTitle] = useState(post.metaTitle);
  const [metaDescription, setMetaDescription] = useState(post.metaDescription);
  const [faq, setFaq] = useState<FaqItem[]>(post.faq);
  const [screenshots, setScreenshots] = useState<Screenshot[]>(post.screenshots);
  const [related, setRelated] = useState<string[]>(post.relatedSlugs);
  const [featuredImage, setFeaturedImage] = useState(post.featuredImage);
  const [showPreview, setShowPreview] = useState(false);

  const sections = useMemo(() => listSections(body), [body]);
  const errors = saveState.errors ?? {};
  const blocked = post.qualityNotes.startsWith('BLOCKED');

  return (
    <div className="space-y-6">
      <header className="surface flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={post.status} />
            {post.qualityScore !== null ? (
              <Badge tone={post.qualityScore >= 85 ? 'ok' : post.qualityScore >= 60 ? 'warn' : 'danger'}>
                Quality {post.qualityScore}/100
              </Badge>
            ) : null}
            {blocked ? <Badge tone="danger">Identifier check failed</Badge> : null}
            {post.testedOnBuild ? (
              <Badge tone="ok">Tested on {post.testedOnBuild}</Badge>
            ) : (
              <Badge tone="warn">Verification pending</Badge>
            )}
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {post.categoryPath}/{slug}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {post.status === 'PUBLISHED' ? (
            <Link
              href={`${post.categoryPath}/${post.slug}`}
              target="_blank"
              className={buttonClass('ghost', 'sm')}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              View live
            </Link>
          ) : null}

          <form action={statusAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={post.id} />
            {post.status !== 'PUBLISHED' ? (
              <SubmitButton size="sm" name="status" value="PUBLISHED">
                Publish
              </SubmitButton>
            ) : (
              <SubmitButton size="sm" variant="outline" name="status" value="DRAFT">
                Unpublish
              </SubmitButton>
            )}
            {post.status !== 'REVIEW' ? (
              <SubmitButton size="sm" variant="outline" name="status" value="REVIEW">
                Send to review
              </SubmitButton>
            ) : null}
            {post.status !== 'ARCHIVED' ? (
              <SubmitButton size="sm" variant="ghost" name="status" value="ARCHIVED">
                Archive
              </SubmitButton>
            ) : null}
          </form>
        </div>
      </header>

      <FormMessage state={statusState} />

      {post.qualityNotes ? (
        <details className={cn('surface p-4', blocked && 'border-danger/40')} open={blocked}>
          <summary className="cursor-pointer text-sm font-medium">
            Quality notes {blocked ? '— publishing is not recommended' : ''}
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {post.qualityNotes}
          </pre>
        </details>
      ) : null}

      <form action={saveAction} className="space-y-6">
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="faqJson" value={JSON.stringify(faq)} />
        <input type="hidden" name="screenshotsJson" value={JSON.stringify(screenshots)} />
        <input type="hidden" name="relatedSlugsJson" value={JSON.stringify(related)} />
        <input type="hidden" name="featuredImage" value={featuredImage} />

        <FormMessage state={saveState} />

        <section className="surface space-y-5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Article
          </h2>

          <Field label="Title (H1)" htmlFor="title" error={errors.title}>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Slug" htmlFor="slug" error={errors.slug}>
              <div className="flex gap-2">
                <input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={`${inputClass} font-mono`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setSlug(slugify(title))}
                  className={buttonClass('outline', 'md', 'shrink-0')}
                >
                  From title
                </button>
              </div>
            </Field>

            <Field
              label="Affected builds"
              htmlFor="affectedBuilds"
              hint="Comma separated. Only builds confirmed by a source."
            >
              <input
                id="affectedBuilds"
                name="affectedBuilds"
                defaultValue={post.affectedBuilds.join(', ')}
                className={inputClass}
                placeholder="26100.2314, 22631.4460"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={post.categoryId}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Author" htmlFor="authorId" error={errors.authorId}>
              <select id="authorId" name="authorId" defaultValue={post.authorId} className={inputClass}>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Tested on build"
              htmlFor="testedOnBuild"
              hint="Setting this stamps today as the verification date."
            >
              <input
                id="testedOnBuild"
                name="testedOnBuild"
                defaultValue={post.testedOnBuild}
                className={inputClass}
                placeholder="26100.2314"
              />
            </Field>
          </div>

          <Field
            label="Quick answer"
            htmlFor="quickAnswer"
            hint="Two to three sentences. This is the box at the top of the page."
            error={errors.quickAnswer}
          >
            <textarea
              id="quickAnswer"
              name="quickAnswer"
              value={quickAnswer}
              onChange={(e) => setQuickAnswer(e.target.value)}
              rows={3}
              className={inputClass}
              required
            />
          </Field>
        </section>

        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Body (markdown)
            </h2>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={buttonClass('outline', 'sm')}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {showPreview ? 'Hide preview' : 'Live preview'}
            </button>
          </div>

          {errors.body ? <p className="mt-2 text-xs text-danger">{errors.body}</p> : null}

          <div className={cn('mt-4 grid gap-4', showPreview && 'lg:grid-cols-2')}>
            <textarea
              id="body"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={26}
              className={textareaClass}
              spellCheck
              required
            />
            {showPreview ? <MarkdownPreview source={body} /> : null}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {body.trim().split(/\s+/).filter(Boolean).length} words · {sections.length} method
            section{sections.length === 1 ? '' : 's'}
          </p>
        </section>

        <section className="surface space-y-5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Search appearance
          </h2>

          <Field label="Meta title" htmlFor="metaTitle" error={errors.metaTitle}>
            <input
              id="metaTitle"
              name="metaTitle"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className={inputClass}
              required
            />
            <div className="mt-1 flex justify-end">
              <CharCount value={metaTitle} max={60} />
            </div>
          </Field>

          <Field label="Meta description" htmlFor="metaDescription" error={errors.metaDescription}>
            <textarea
              id="metaDescription"
              name="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              className={inputClass}
              required
            />
            <div className="mt-1 flex justify-end">
              <CharCount value={metaDescription} max={160} />
            </div>
          </Field>

          <SerpPreview
            title={metaTitle || title}
            description={metaDescription}
            path={`${post.categoryPath}/${slug}`}
          />
        </section>

        <FaqEditor faq={faq} onChange={setFaq} />

        <MediaEditor
          postId={post.id}
          title={title}
          featuredImage={featuredImage}
          screenshots={screenshots}
          onFeaturedChange={setFeaturedImage}
          onScreenshotsChange={setScreenshots}
        />

        <RelatedPicker options={relatedOptions} value={related} onChange={setRelated} />

        {post.sources.length > 0 ? (
          <section className="surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sources used at generation
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {post.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/95 p-4 backdrop-blur">
          <SubmitButton size="lg">Save changes</SubmitButton>
          <p className="text-xs text-muted-foreground">
            Saving does not change the status. Use the buttons at the top to publish.
          </p>
        </div>
      </form>

      <RegenerateSection postId={post.id} sections={sections} />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function MarkdownPreview({ source }: { source: string }) {
  // Deliberately minimal: headings, lists, code fences, bold and links.
  // The published page renders sanitised HTML server-side — this is a writing
  // aid, so it stays cheap and never renders raw HTML from the textarea.
  const blocks = useMemo(() => source.split(/\n{2,}/), [source]);

  return (
    <div className="prose prose-sm max-h-[40rem] max-w-none overflow-auto rounded-md border border-border bg-muted/30 p-4 dark:prose-invert">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('```')) {
          return (
            <pre key={index}>
              <code>{trimmed.replace(/^```[a-z]*\n?/, '').replace(/```$/, '')}</code>
            </pre>
          );
        }
        const heading = /^(#{2,4})\s+(.*)$/.exec(trimmed);
        if (heading) {
          const Tag = (['h2', 'h3', 'h4'] as const)[heading[1].length - 2] ?? 'h4';
          return <Tag key={index}>{heading[2]}</Tag>;
        }
        if (/^\s*[-*]\s+/m.test(trimmed)) {
          return (
            <ul key={index}>
              {trimmed.split('\n').map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        if (/^\s*\d+\.\s+/m.test(trimmed)) {
          return (
            <ol key={index}>
              {trimmed.split('\n').map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>
              ))}
            </ol>
          );
        }
        return <p key={index}>{inline(trimmed)}</p>;
      })}
    </div>
  );
}

/** Renders **bold**, `code` and [links](url) as text — no HTML is interpreted. */
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <span key={i} className="text-brand underline">{link[1]}</span>;
    return <span key={i}>{part}</span>;
  });
}

function SerpPreview({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">Google result preview</p>
      <p className="mt-2 truncate text-xs text-muted-foreground">example.com{path}</p>
      <p className="mt-0.5 truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
        {title || 'Untitled'}
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
        {description || 'No meta description set.'}
      </p>
    </div>
  );
}

function FaqEditor({ faq, onChange }: { faq: FaqItem[]; onChange: (next: FaqItem[]) => void }) {
  const update = (index: number, patch: Partial<FaqItem>) =>
    onChange(faq.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <section className="surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          FAQ ({faq.length})
        </h2>
        <button
          type="button"
          onClick={() => onChange([...faq, { question: '', answer: '' }])}
          className={buttonClass('outline', 'sm')}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add
        </button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Emitted as FAQPage structured data. Three to five entries; the answers must be visible on
        the page, which they are.
      </p>

      <div className="mt-4 space-y-4">
        {faq.map((item, index) => (
          <div key={index} className="rounded-md border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <input
                  aria-label={`Question ${index + 1}`}
                  value={item.question}
                  onChange={(e) => update(index, { question: e.target.value })}
                  placeholder="Question"
                  className={inputClass}
                />
                <textarea
                  aria-label={`Answer ${index + 1}`}
                  value={item.answer}
                  onChange={(e) => update(index, { answer: e.target.value })}
                  placeholder="Answer"
                  rows={3}
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(faq.filter((_, i) => i !== index))}
                aria-label={`Remove question ${index + 1}`}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {faq.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function MediaEditor({
  postId,
  title,
  featuredImage,
  screenshots,
  onFeaturedChange,
  onScreenshotsChange,
}: {
  postId: string;
  title: string;
  featuredImage: string;
  screenshots: Screenshot[];
  onFeaturedChange: (url: string) => void;
  onScreenshotsChange: (next: Screenshot[]) => void;
}) {
  const [uploadState, uploadAction] = useActionState<ActionState, FormData>(
    uploadScreenshot,
    EMPTY_STATE,
  );
  const [target, setTarget] = useState<'featured' | 'screenshot'>('screenshot');

  // Apply the most recent successful upload to whichever slot was selected.
  const [appliedUrl, setAppliedUrl] = useState<string | null>(null);
  if (uploadState.ok && uploadState.url && uploadState.url !== appliedUrl) {
    setAppliedUrl(uploadState.url);
    if (target === 'featured') onFeaturedChange(uploadState.url);
    else onScreenshotsChange([...screenshots, { url: uploadState.url, alt: '' }]);
  }

  return (
    <section className="surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Images
      </h2>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Featured image</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            1200×630 or wider. Required before a post can be published.
          </p>
          {featuredImage ? (
            <div className="mt-3">
              <div className="relative aspect-[1200/630] overflow-hidden rounded-md border border-border bg-muted">
                <Image src={featuredImage} alt="" fill sizes="480px" className="object-cover" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <p className="flex-1 truncate font-mono text-xs text-muted-foreground">
                  {featuredImage}
                </p>
                <button
                  type="button"
                  onClick={() => onFeaturedChange('')}
                  className={buttonClass('ghost', 'sm')}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No featured image. The pipeline normally generates one via /api/og.
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium">Screenshots ({screenshots.length})</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Real screenshots from the machine the fix was tested on.
          </p>

          <div className="mt-3 space-y-3">
            {screenshots.map((shot, index) => (
              <div key={shot.url} className="flex items-start gap-3 rounded-md border border-border p-3">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-muted">
                  <Image src={shot.url} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <input
                  aria-label={`Alt text for screenshot ${index + 1}`}
                  value={shot.alt}
                  onChange={(e) =>
                    onScreenshotsChange(
                      screenshots.map((s, i) => (i === index ? { ...s, alt: e.target.value } : s)),
                    )
                  }
                  placeholder="Alt text — describe what the screenshot shows"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => onScreenshotsChange(screenshots.filter((_, i) => i !== index))}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*
        The uploader has no <form> of its own. It used to render one and point
        the file input and button at it with `form="upload-form"`, but this
        section is itself inside the main save form, so that produced a nested
        <form> — invalid HTML. The parser drops the inner start tag and lets its
        </form> close the *outer* form early, which merged the uploader's fields
        and its server-action refs into the save form: the save form ended up
        carrying two `$ACTION_REF` sets, and a submit could resolve to the wrong
        action entirely. That is what surfaced as a stray "Unknown status." —
        `setPostStatus` receiving the save form's data, which has `id` but no
        `status`.

        Instead the button overrides the enclosing form's action with
        `formAction`. The whole save form is posted to `uploadScreenshot`, which
        reads only `file` and `prefix` and ignores the rest.
      */}
      <CoverPicker postId={postId} defaultQuery={title} />

      <div className="mt-6 rounded-md border border-dashed border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="upload-target" className="block text-xs text-muted-foreground">
              Upload as
            </label>
            <select
              id="upload-target"
              value={target}
              onChange={(e) => setTarget(e.target.value as 'featured' | 'screenshot')}
              className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="screenshot">Screenshot</option>
              <option value="featured">Featured image</option>
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="upload-file" className="block text-xs text-muted-foreground">
              File (PNG, JPEG, WebP, AVIF or GIF — max 8 MB)
            </label>
            <input
              id="upload-file"
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            <input type="hidden" name="prefix" value="posts" />
          </div>
          <button
            type="submit"
            formAction={uploadAction}
            className={buttonClass('outline', 'md')}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </button>
        </div>
        <div className="mt-3">
          <FormMessage state={uploadState} />
        </div>
      </div>

    </section>
  );
}

function RelatedPicker({
  options,
  value,
  onChange,
}: {
  options: RelatedOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return options
      .filter((o) => !q || o.title.toLowerCase().includes(q) || o.slug.includes(q))
      .slice(0, 40);
  }, [options, filter]);

  return (
    <section className="surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Related posts ({value.length})
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Three to five internal links. The article page tops this up from the same category if you
        pick fewer.
      </p>

      {value.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {value.map((slug) => {
            const option = options.find((o) => o.slug === slug);
            return (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((s) => s !== slug))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand"
                >
                  {option?.title ?? slug}
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter published posts…"
        aria-label="Filter published posts"
        className={`${inputClass} mt-4`}
      />

      <ul className="mt-3 max-h-56 divide-y divide-border overflow-auto rounded-md border border-border">
        {visible.map((option) => {
          const selected = value.includes(option.slug);
          return (
            <li key={option.slug}>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    selected ? value.filter((s) => s !== option.slug) : [...value, option.slug],
                  )
                }
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  selected && 'bg-brand/5',
                )}
              >
                <span className="truncate">{option.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {option.categoryName}
                </span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted-foreground">
            No published posts to link to yet.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function RegenerateSection({ postId, sections }: { postId: string; sections: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(regenerateSection, EMPTY_STATE);

  if (sections.length === 0) return null;

  return (
    <section className="surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
        Regenerate a section
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Rewrites one H2 section in place and saves immediately. Save any unsaved body edits first —
        this reads the stored version.
      </p>

      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="postId" value={postId} />
        <div className="min-w-56">
          <label htmlFor="heading" className="block text-xs text-muted-foreground">
            Section
          </label>
          <select id="heading" name="heading" className={`${inputClass} mt-1`}>
            {sections.map((heading) => (
              <option key={heading} value={heading}>
                {heading}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-64 flex-1">
          <label htmlFor="instruction" className="block text-xs text-muted-foreground">
            Instruction (optional)
          </label>
          <input
            id="instruction"
            name="instruction"
            placeholder="Add the PowerShell equivalent for each step"
            className={`${inputClass} mt-1`}
          />
        </div>
        <SubmitButton variant="outline">Regenerate</SubmitButton>
      </form>

      <div className="mt-3">
        <FormMessage state={state} />
      </div>
    </section>
  );
}
