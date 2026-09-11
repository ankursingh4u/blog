'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';

import { acceptSubmission, rejectSubmission, type ActionState } from '@/lib/admin/actions';
import { SubmitButton, inputClass } from '@/components/admin/form-controls';
import { Callout, buttonClass } from '@/components/ui/primitives';

const INITIAL: ActionState = { ok: false, message: '' };

export interface SubmissionView {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorEmail: string;
  /** JSON array of { url, alt } as stored. */
  images: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  postId: string | null;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  createdAt: string;
}

export function SubmissionCard({
  submission,
  categories,
}: {
  submission: SubmissionView;
  categories: Array<{ id: string; name: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [acceptState, accept] = useActionState(acceptSubmission, INITIAL);
  const [rejectState, reject] = useActionState(rejectSubmission, INITIAL);

  let images: Array<{ url: string; alt?: string }> = [];
  try {
    const parsed: unknown = JSON.parse(submission.images || '[]');
    if (Array.isArray(parsed)) images = parsed as Array<{ url: string; alt?: string }>;
  } catch {
    // A malformed images column must not take down the queue.
  }

  const words = submission.body.trim().split(/\s+/).length;
  const error = acceptState.message && !acceptState.ok ? acceptState.message : rejectState.message;

  return (
    <article className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug">{submission.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {submission.authorName} ·{' '}
            <a href={`mailto:${submission.authorEmail}`} className="underline hover:text-foreground">
              {submission.authorEmail}
            </a>{' '}
            · {submission.createdAt} · {words} words
            {submission.suggestedCategoryName ? ` · suggested: ${submission.suggestedCategoryName}` : ''}
          </p>
        </div>

        {submission.status === 'APPROVED' && submission.postId ? (
          <Link href={`/admin/posts/${submission.postId}`} className={buttonClass('outline', 'sm')}>
            Open the draft
          </Link>
        ) : null}
      </div>

      {error ? (
        <Callout tone="danger" title="Could not complete" className="mt-4">
          {error}
        </Callout>
      ) : null}

      {submission.note ? (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Note: {submission.note}
        </p>
      ) : null}

      {/*
        Plain text, deliberately. This is unreviewed input from a stranger, and
        `whitespace-pre-wrap` shows exactly what was sent — no markdown, no HTML,
        nothing that could execute or mislead the person deciding on it.
      */}
      <div className="mt-4 rounded-md border border-border bg-background p-4">
        <p
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
            expanded ? '' : 'line-clamp-6'
          }`}
        >
          {submission.body}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {expanded ? 'Show less' : 'Read it all'}
        </button>
      </div>

      {images.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((img) => (
            <div
              key={img.url}
              className="relative h-20 w-28 overflow-hidden rounded-md border border-border bg-muted"
            >
              <Image src={img.url} alt={img.alt || ''} fill sizes="112px" className="object-cover" />
            </div>
          ))}
        </div>
      ) : null}

      {submission.status === 'PENDING' ? (
        <div className="mt-5 border-t border-border pt-4">
          <form action={accept} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={submission.id} />
            <div>
              <label htmlFor={`cat-${submission.id}`} className="block text-xs text-muted-foreground">
                Publish into
              </label>
              <select
                id={`cat-${submission.id}`}
                name="categoryId"
                defaultValue={submission.suggestedCategoryId ?? ''}
                className={`${inputClass} mt-1 h-9 w-56`}
              >
                <option value="">Choose a section…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <SubmitButton>
              <Check className="h-4 w-4" aria-hidden="true" />
              Accept as draft
            </SubmitButton>

            <button
              type="button"
              onClick={() => setRejecting((v) => !v)}
              className={buttonClass('ghost', 'md')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Reject
            </button>
          </form>

          {rejecting ? (
            <form action={reject} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={submission.id} />
              <div className="min-w-64 flex-1">
                <label htmlFor={`note-${submission.id}`} className="block text-xs text-muted-foreground">
                  Reason (internal, optional)
                </label>
                <input id={`note-${submission.id}`} name="note" className={`${inputClass} mt-1 h-9`} />
              </div>
              <SubmitButton variant="outline">Confirm rejection</SubmitButton>
            </form>
          ) : null}

          <p className="mt-3 text-xs text-muted-foreground">
            Accepting creates a <strong>draft</strong> under the contributor&rsquo;s name. It does not
            publish — you edit and publish it like any other post.
          </p>
        </div>
      ) : null}
    </article>
  );
}
