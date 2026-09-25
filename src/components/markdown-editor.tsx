'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  PenLine,
  Quote,
  Strikethrough,
} from 'lucide-react';

import { previewSubmission } from '@/lib/preview-action';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';
import { MAX_BODY_WORDS, MIN_BODY_CHARS, countWords } from '@/lib/submission-limits';
import {
  type Edit,
  insertLink,
  toggleInline,
  toggleLinePrefix,
  toggleOrderedList,
} from '@/lib/markdown-format';

/**
 * A formatting toolbar over a plain textarea, rather than a contenteditable
 * rich-text editor.
 *
 * Submissions are stored and published as markdown, and the render pipeline
 * drops raw HTML twice over. A WYSIWYG surface would produce exactly the HTML
 * that pipeline exists to throw away, so what a contributor saw while writing
 * would not be what ran. Editing the markdown directly keeps the two identical,
 * and the preview proves it by rendering through the real pipeline.
 *
 * The transformations live in `lib/markdown-format`; this is the surface around
 * them. The form still posts one `body` field and `submitArticle` is unchanged.
 */

type ToolId = 'bold' | 'italic' | 'strike' | 'h2' | 'h3' | 'quote' | 'ul' | 'ol' | 'link' | 'code';

const TOOLS: {
  id: ToolId;
  label: string;
  hint: string;
  icon: typeof Bold;
  group: number;
}[] = [
  { id: 'bold', label: 'Bold', hint: 'Ctrl+B', icon: Bold, group: 0 },
  { id: 'italic', label: 'Italic', hint: 'Ctrl+I', icon: Italic, group: 0 },
  { id: 'strike', label: 'Strikethrough', hint: '', icon: Strikethrough, group: 0 },
  { id: 'h2', label: 'Heading', hint: 'Section title', icon: Heading2, group: 1 },
  { id: 'h3', label: 'Subheading', hint: '', icon: Heading3, group: 1 },
  { id: 'quote', label: 'Quote', hint: '', icon: Quote, group: 2 },
  { id: 'ul', label: 'Bulleted list', hint: '', icon: List, group: 2 },
  { id: 'ol', label: 'Numbered list', hint: '', icon: ListOrdered, group: 2 },
  { id: 'link', label: 'Link', hint: 'Ctrl+K', icon: Link2, group: 3 },
  { id: 'code', label: 'Code', hint: '', icon: Code, group: 3 },
];

export function MarkdownEditor({
  name,
  id,
  defaultValue = '',
  placeholder,
}: {
  name: string;
  id: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [html, setHtml] = useState('');
  const [article, setArticle] = useState<ArticleShell | null>(null);
  const [pending, startTransition] = useTransition();

  const words = countWords(value);
  const over = words > MAX_BODY_WORDS;

  /*
   * Blocks the send natively rather than by disabling the button.
   *
   * setCustomValidity means the browser refuses the submit and points at this
   * field with the reason, which also keeps the check honest when the editor is
   * not the thing that has focus. The server enforces the same limit through
   * the same countWords, so a client with JavaScript off is no way around it.
   */
  useEffect(() => {
    ref.current?.setCustomValidity(
      over ? `Articles are limited to ${MAX_BODY_WORDS} words — this one is ${words}.` : '',
    );
  }, [over, words]);

  const apply = useCallback((tool: ToolId) => {
    const textarea = ref.current;
    if (!textarea) return;

    const { selectionStart: s, selectionEnd: e, value: current } = textarea;
    let edit: Edit;

    switch (tool) {
      case 'bold':
        edit = toggleInline(current, s, e, '**');
        break;
      case 'italic':
        edit = toggleInline(current, s, e, '_');
        break;
      case 'strike':
        edit = toggleInline(current, s, e, '~~');
        break;
      case 'code':
        edit = toggleInline(current, s, e, '`');
        break;
      case 'h2':
        edit = toggleLinePrefix(current, s, e, '## ');
        break;
      case 'h3':
        edit = toggleLinePrefix(current, s, e, '### ');
        break;
      case 'quote':
        edit = toggleLinePrefix(current, s, e, '> ');
        break;
      case 'ul':
        edit = toggleLinePrefix(current, s, e, '- ');
        break;
      case 'ol':
        edit = toggleOrderedList(current, s, e);
        break;
      case 'link':
        edit = insertLink(current, s, e);
        break;
    }

    setValue(edit.value);
    // The selection has to be restored after React has written the new value,
    // or the browser drops the caret at the end of the textarea.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const shortcut = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : null;
    if (!shortcut) return;
    event.preventDefault();
    apply(shortcut);
  }

  /**
   * Reads the rest of the form so the preview is the article, not just the body.
   *
   * The headline, section, byline and pictures live in sibling fields, and a
   * preview that showed the prose alone answered the wrong question — a writer
   * wants to know how the piece will look on the site, cover and all. Reading
   * them off the form element at preview time avoids lifting four more pieces
   * of state into the parent for something that is only needed on a click.
   *
   * Object URLs are created here and revoked when the shell is replaced, so
   * flipping between Write and Preview does not leak a blob per press.
   */
  function showPreview() {
    setMode('preview');

    const form = ref.current?.form;
    if (form) {
      const data = new FormData(form);
      const heroFile = data.get('heroImage');
      const section = form.querySelector<HTMLSelectElement>('select[name="categoryId"]');

      setArticle({
        title: String(data.get('title') ?? '').trim(),
        section: section?.selectedOptions[0]?.value ? section.selectedOptions[0].text : '',
        author: String(data.get('authorName') ?? '').trim(),
        hero: heroFile instanceof File && heroFile.size > 0 ? URL.createObjectURL(heroFile) : null,
        images: data
          .getAll('images')
          .map((file, i) =>
            file instanceof File && file.size > 0
              ? {
                  url: URL.createObjectURL(file),
                  caption: String(data.getAll('imageTitles')[i] ?? '').trim(),
                }
              : null,
          )
          .filter((image): image is PreviewImage => image !== null),
      });
    }

    startTransition(async () => setHtml(await previewSubmission(value)));
  }

  // Revoking on unmount as well as on replacement — a form that is submitted
  // successfully unmounts this whole subtree without ever leaving preview.
  useEffect(() => {
    if (!article) return;
    return () => {
      if (article.hero) URL.revokeObjectURL(article.hero);
      for (const image of article.images) URL.revokeObjectURL(image.url);
    };
  }, [article]);

  const short = value.length > 0 && value.length < MIN_BODY_CHARS;

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card/60 px-2 py-1.5">
        {TOOLS.map((tool, i) => (
          <span key={tool.id} className="flex items-center">
            {i > 0 && TOOLS[i - 1].group !== tool.group ? (
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            ) : null}
            <button
              type="button"
              onClick={() => apply(tool.id)}
              disabled={mode === 'preview'}
              title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
              aria-label={tool.label}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <tool.icon className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <ModeButton active={mode === 'write'} onClick={() => setMode('write')} icon={PenLine}>
            Write
          </ModeButton>
          <ModeButton active={mode === 'preview'} onClick={showPreview} icon={pending ? Loader2 : Eye} spin={pending}>
            Preview
          </ModeButton>
        </div>
      </div>

      {/*
        The textarea stays mounted in preview so the form still posts `body`
        and the caret position survives switching back and forth.
      */}
      <div className={mode === 'preview' ? 'hidden' : undefined}>
        <textarea
          ref={ref}
          id={id}
          name={name}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="block min-h-[30rem] w-full resize-y bg-transparent px-5 py-5 text-[15px] leading-[1.85] outline-none placeholder:text-muted-foreground sm:px-8 sm:py-7"
        />
      </div>

      {mode === 'preview' ? (
        <div className="bg-muted/20 px-5 py-8 sm:px-8 sm:py-10">
          {pending ? (
            <p className="text-sm text-muted-foreground">Laying it out…</p>
          ) : (
            <ArticlePreview article={article} html={html} />
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span className={cn('tabular-nums', over && 'font-medium text-danger')}>
          {words.toLocaleString()} / {MAX_BODY_WORDS} words
        </span>
        {over ? (
          <span className="text-danger">
            {(words - MAX_BODY_WORDS).toLocaleString()} over — trim before sending
          </span>
        ) : null}
        {short ? <span className="text-warn">At least {MIN_BODY_CHARS} characters to send</span> : null}
        <span className="ml-auto hidden sm:inline">Select text, then use the toolbar</span>
      </div>
    </div>
  );
}

interface PreviewImage {
  url: string;
  caption: string;
}

interface ArticleShell {
  title: string;
  section: string;
  author: string;
  hero: string | null;
  images: PreviewImage[];
}

/**
 * The submission as it would run on the site.
 *
 * Deliberately mirrors `article/article-view.tsx` — section badge, headline,
 * byline, then the cover at 1200x630, then the prose — because the point of the
 * preview is to answer "where does my headline sit, and how is my picture
 * cropped", which a bare block of rendered markdown cannot.
 *
 * Plain <img> rather than next/image: these are object URLs for files that have
 * not been uploaded yet, so there is nothing for the optimiser to fetch.
 */
function ArticlePreview({ article, html }: { article: ArticleShell | null; html: string }) {
  if (!html && !article?.title) {
    return <p className="text-sm text-muted-foreground">Nothing written yet.</p>;
  }

  return (
    <article className="mx-auto max-w-prose">
      {article?.section ? <Badge tone="brand">{article.section}</Badge> : null}

      <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        {article?.title || 'Your headline goes here'}
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        By {article?.author || 'your name'} · not published yet
      </p>

      <figure className="mt-8">
        <div className="relative aspect-[1200/630] overflow-hidden rounded-lg border border-border bg-muted">
          {article?.hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.hero}
              alt={article.title || 'Cover image'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
              No cover chosen — this is the space it would fill, on cards and
              when the article is shared.
            </div>
          )}
        </div>
      </figure>

      <div
        className="prose prose-lg mt-10 max-w-none dark:prose-invert"
        // Rendered by `previewSubmission`, which runs the same rehype-sanitize
        // allow-list the published article goes through.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {article?.images.length ? (
        <section aria-label="Images" className="mt-12 space-y-8">
          {article.images.map((image) => (
            <figure key={image.url}>
              <div className="overflow-hidden rounded-lg border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.caption} className="w-full" />
              </div>
              {image.caption ? (
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </section>
      ) : null}
    </article>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  spin,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  spin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} aria-hidden="true" />
      {children}
    </button>
  );
}
