'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Send } from 'lucide-react';

import { submitArticle, type SubmitState } from '@/lib/submit-action';
import { Field, inputClass } from '@/components/admin/form-controls';
import { Callout, buttonClass } from '@/components/ui/primitives';
import { MAX_IMAGES, MAX_IMAGE_BYTES, MAX_TITLE_CHARS, MAX_NAME_CHARS, MAX_EMAIL_CHARS } from '@/lib/submission-limits';

const INITIAL: SubmitState = { ok: false, message: '' };

export interface CategoryOption {
  id: string;
  name: string;
}

export function SubmitForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action] = useActionState(submitArticle, INITIAL);

  // On success the form is replaced rather than reset. Leaving a filled-in
  // article on screen beside "thanks, we got it" invites a second send of the
  // same piece.
  if (state.ok) {
    return (
      <div className="surface p-8">
        <h2 className="text-xl font-semibold tracking-tight">Article received</h2>
        <p className="mt-3 text-muted-foreground">{state.message}</p>
        {state.warnings?.length ? (
          <Callout tone="warn" title="Some images were not kept" className="mt-6">
            <ul className="list-disc pl-5">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
        <p className="mt-6 text-sm text-muted-foreground">
          Editors read everything that comes in. Nothing is published automatically.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="surface space-y-6 p-6 sm:p-8">
      {state.message ? (
        <Callout tone="danger" title="Not sent">
          {state.message}
        </Callout>
      ) : null}

      <Field
        label="Headline"
        htmlFor="title"
        hint="What the article is called. This becomes the page title if it runs."
        error={state.errors?.title}
      >
        <input
          id="title"
          name="title"
          required
          maxLength={MAX_TITLE_CHARS}
          className={inputClass}
          placeholder="What happened, in one line"
        />
      </Field>

      <Field
        label="Section"
        htmlFor="categoryId"
        hint="Where you think it belongs. An editor may move it."
      >
        <select id="categoryId" name="categoryId" className={inputClass} defaultValue="">
          <option value="">Not sure</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Images"
        htmlFor="images"
        hint={`Optional. Up to ${MAX_IMAGES}, ${Math.round(
          MAX_IMAGE_BYTES / 1024 / 1024,
        )}MB each. Only send images you have the right to publish.`}
      >
        <input
          id="images"
          name="images"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/70"
        />
      </Field>

      <Field
        label="Your article"
        htmlFor="body"
        hint="Write it here. Plain text is fine — an editor will format it."
        error={state.errors?.body}
      >
        <textarea
          id="body"
          name="body"
          required
          rows={18}
          className={`${inputClass} min-h-[26rem] leading-relaxed`}
          placeholder="Write your article here."
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" htmlFor="authorName" hint="This is the byline." error={state.errors?.authorName}>
          <input id="authorName" name="authorName" required maxLength={MAX_NAME_CHARS} className={inputClass} />
        </Field>

        <Field
          label="Your email"
          htmlFor="authorEmail"
          hint="So we can reply. Never published."
          error={state.errors?.authorEmail}
        >
          <input
            id="authorEmail"
            name="authorEmail"
            type="email"
            required
            maxLength={MAX_EMAIL_CHARS}
            className={inputClass}
          />
        </Field>
      </div>

      {/*
        Honeypot. Hidden from people by position rather than `display:none`,
        which some bots check for, and taken out of the tab order and the
        accessibility tree so nobody reaches it by keyboard or screen reader.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <SubmitButton />
        <p className="text-xs text-muted-foreground">
          By sending this you confirm it is your own work and that we may publish it under your name.
        </p>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass('primary', 'md')}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? 'Sending…' : 'Send to the editors'}
    </button>
  );
}
