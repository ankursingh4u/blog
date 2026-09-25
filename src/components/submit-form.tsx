'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Send } from 'lucide-react';

import { submitArticle, type SubmitState } from '@/lib/submit-action';
import { Field, inputClass } from '@/components/admin/form-controls';
import { MarkdownEditor } from '@/components/markdown-editor';
import { HeroImageField, SubmissionImages } from '@/components/submission-images';
import { Callout, buttonClass } from '@/components/ui/primitives';
import {
  MAX_BIO_CHARS,
  MAX_EMAIL_CHARS,
  MAX_NAME_CHARS,
  MAX_TITLE_CHARS,
} from '@/lib/submission-limits';

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
        label="Hero image"
        htmlFor="heroImage"
        hint="The main picture. This is what appears on cards and when the article is shared."
      >
        <HeroImageField />
      </Field>

      <SubmissionImages />

      <Field
        label="Your article"
        htmlFor="body"
        hint="Up to 500 words. Use the toolbar for headings, emphasis, quotes and links — Preview shows the article exactly as it would appear on the site."
        error={state.errors?.body}
      >
        <MarkdownEditor
          id="body"
          name="body"
          placeholder="Write your article here. Start with what happened, then explain why it matters."
        />
      </Field>

      <fieldset className="space-y-6 border-t border-border pt-6">
        <legend className="sr-only">About you</legend>
        <h2 className="text-sm font-semibold">About you</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Your name"
            htmlFor="authorName"
            hint="This is the byline."
            error={state.errors?.authorName}
          >
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

        <Field
          label="About you"
          htmlFor="authorBio"
          hint="A line or two, in your own words. This becomes the bio on your author page."
          error={state.errors?.authorBio}
        >
          <textarea
            id="authorBio"
            name="authorBio"
            rows={3}
            maxLength={MAX_BIO_CHARS}
            className={inputClass}
            placeholder="What you do, and why you know about this."
          />
        </Field>

        <Field
          label="A link (optional)"
          htmlFor="authorUrl"
          hint="Your site or a profile, if you want one shown."
          error={state.errors?.authorUrl}
        >
          <input
            id="authorUrl"
            name="authorUrl"
            type="url"
            maxLength={200}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
      </fieldset>

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
