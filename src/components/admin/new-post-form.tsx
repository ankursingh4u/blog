'use client';

import { useActionState, useState } from 'react';
import { Newspaper, PenLine } from 'lucide-react';
import { createPost } from '@/lib/admin/actions';
import { EMPTY_STATE, FormMessage, SubmitButton } from '@/components/admin/form-controls';
import { cn } from '@/lib/utils';

export interface TopicOption {
  id: string;
  phrase: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Whether the ingest attached a real article URL, or only a discovery marker. */
  hasSource: boolean;
  ageHours: number | null;
}

export interface SectionOption {
  id: string;
  name: string;
}

/**
 * Start a new article, either from a trending topic the ingest found or from
 * nothing.
 *
 * Choosing a topic carries its section and its sources across, which is the
 * part that is tedious to reproduce by hand. Neither path calls a language
 * model — the whole point of writing here rather than generating is that it
 * costs nothing.
 */
export function NewPostForm({
  topics,
  sections,
}: {
  topics: TopicOption[];
  sections: SectionOption[];
}) {
  const [state, action] = useActionState(createPost, EMPTY_STATE);
  const [mode, setMode] = useState<'topic' | 'blank'>(topics.length > 0 ? 'topic' : 'blank');
  const [selected, setSelected] = useState<TopicOption | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(sections[0]?.id ?? '');

  function pick(topic: TopicOption) {
    setSelected(topic);
    setTitle(topic.phrase);
    if (topic.categoryId) setCategoryId(topic.categoryId);
  }

  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />

      <div className="flex gap-2">
        <ModeButton active={mode === 'topic'} onClick={() => setMode('topic')} disabled={topics.length === 0}>
          <Newspaper className="h-4 w-4" aria-hidden="true" />
          From a trending topic
        </ModeButton>
        <ModeButton active={mode === 'blank'} onClick={() => { setMode('blank'); setSelected(null); }}>
          <PenLine className="h-4 w-4" aria-hidden="true" />
          Start blank
        </ModeButton>
      </div>

      {mode === 'topic' ? (
        topics.length === 0 ? (
          <div className="surface p-6 text-sm text-muted-foreground">
            No topics queued. Run the ingest from the dashboard — it reads Google News and costs
            nothing.
          </div>
        ) : (
          <div className="surface max-h-[26rem] overflow-auto p-2">
            <ul className="divide-y divide-border">
              {topics.map((topic) => (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => pick(topic)}
                    aria-pressed={selected?.id === topic.id}
                    className={cn(
                      'block w-full px-3 py-2.5 text-left transition-colors',
                      selected?.id === topic.id ? 'bg-brand/10' : 'hover:bg-muted',
                    )}
                  >
                    <span className="block text-sm font-medium leading-snug">{topic.phrase}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {topic.categoryName ? <span>{topic.categoryName}</span> : null}
                      {topic.ageHours !== null ? (
                        <span>
                          {topic.ageHours < 1
                            ? 'just now'
                            : topic.ageHours < 24
                              ? `${Math.round(topic.ageHours)}h ago`
                              : `${Math.round(topic.ageHours / 24)}d ago`}
                        </span>
                      ) : null}
                      {topic.hasSource ? (
                        <span className="text-ok">sources available</span>
                      ) : (
                        <span>no article link — you supply the sources</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}

      {selected ? <input type="hidden" name="keywordId" value={selected.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="new-title" className="block text-sm font-medium">
            Working title
          </label>
          <input
            id="new-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is this article about?"
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Editable later. The slug and the cover image are generated from it.
          </p>
          {errors.title ? <p className="mt-1.5 text-xs text-danger">{errors.title}</p> : null}
        </div>

        <div>
          <label htmlFor="new-category" className="block text-sm font-medium">
            Section
          </label>
          <select
            id="new-category"
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? (
            <p className="mt-1.5 text-xs text-danger">{errors.categoryId}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="md">Create draft</SubmitButton>
        <p className="text-xs text-muted-foreground">
          {selected
            ? 'Its sources will be fetched and attached. No AI, no cost.'
            : 'Creates an empty draft with a generated cover. No AI, no cost.'}
        </p>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-brand bg-brand/10 font-medium text-foreground'
          : 'border-border text-muted-foreground hover:bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  );
}
