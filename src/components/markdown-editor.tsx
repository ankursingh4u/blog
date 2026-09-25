'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
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
import { MAX_BODY_CHARS, MIN_BODY_CHARS } from '@/lib/submission-limits';
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
  const [pending, startTransition] = useTransition();

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

  function showPreview() {
    setMode('preview');
    startTransition(async () => setHtml(await previewSubmission(value)));
  }

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const short = value.length > 0 && value.length < MIN_BODY_CHARS;
  const over = value.length > MAX_BODY_CHARS;

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
        <div className="min-h-[30rem] px-5 py-5 sm:px-8 sm:py-7">
          {pending ? (
            <p className="text-sm text-muted-foreground">Laying it out…</p>
          ) : html ? (
            <div
              className="prose prose-sm max-w-prose dark:prose-invert"
              // Rendered by `previewSubmission`, which runs the same
              // rehype-sanitize allow-list the published article goes through.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing written yet.</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{words.toLocaleString()} words</span>
        <span
          className={cn(
            'tabular-nums',
            over && 'text-danger',
            short && 'text-warn',
          )}
        >
          {value.length.toLocaleString()} / {MAX_BODY_CHARS.toLocaleString()} characters
        </span>
        {short ? <span className="text-warn">At least {MIN_BODY_CHARS} characters to send</span> : null}
        <span className="ml-auto hidden sm:inline">Select text, then use the toolbar</span>
      </div>
    </div>
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
