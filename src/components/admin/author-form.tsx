'use client';

import { useActionState, useState } from 'react';
import { saveAuthor, type ActionState } from '@/lib/admin/actions';
import {
  EMPTY_STATE,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from '@/components/admin/form-controls';
import { slugify } from '@/lib/utils';
import { buttonClass } from '@/components/ui/primitives';

export interface AuthorFormValues {
  id?: string;
  name: string;
  slug: string;
  bio: string;
  avatar: string;
  stylePrompt: string;
  categoryFocus: string[];
}

export function AuthorForm({
  author,
  categories,
  onDone,
}: {
  author?: AuthorFormValues;
  categories: Array<{ slug: string; name: string }>;
  onDone?: () => void;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveAuthor, EMPTY_STATE);
  const [name, setName] = useState(author?.name ?? '');
  const [slug, setSlug] = useState(author?.slug ?? '');
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-5">
      {author?.id ? <input type="hidden" name="id" value={author.id} /> : null}

      <FormMessage state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor={`name-${author?.id ?? 'new'}`} error={errors.name}>
          <input
            id={`name-${author?.id ?? 'new'}`}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </Field>

        <Field label="Slug" htmlFor={`slug-${author?.id ?? 'new'}`} error={errors.slug}>
          <div className="flex gap-2">
            <input
              id={`slug-${author?.id ?? 'new'}`}
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={`${inputClass} font-mono`}
              required
            />
            <button
              type="button"
              onClick={() => setSlug(slugify(name))}
              className={buttonClass('outline', 'md', 'shrink-0')}
            >
              From name
            </button>
          </div>
        </Field>
      </div>

      <Field
        label="Bio"
        htmlFor={`bio-${author?.id ?? 'new'}`}
        hint="Shown on every article and on the author page. Honest — no invented credentials."
        error={errors.bio}
      >
        <textarea
          id={`bio-${author?.id ?? 'new'}`}
          name="bio"
          defaultValue={author?.bio ?? ''}
          rows={4}
          className={inputClass}
          required
        />
      </Field>

      <Field
        label="Avatar URL"
        htmlFor={`avatar-${author?.id ?? 'new'}`}
        hint="Optional. Leave blank to use the initial badge."
      >
        <input
          id={`avatar-${author?.id ?? 'new'}`}
          name="avatar"
          defaultValue={author?.avatar ?? ''}
          className={inputClass}
          placeholder="/uploads/authors/name.png"
        />
      </Field>

      <Field
        label="Style prompt"
        htmlFor={`style-${author?.id ?? 'new'}`}
        hint="Given to the model at generation time. Describe voice, structure habits and what this author refuses to do."
        error={errors.stylePrompt}
      >
        <textarea
          id={`style-${author?.id ?? 'new'}`}
          name="stylePrompt"
          defaultValue={author?.stylePrompt ?? ''}
          rows={5}
          className={inputClass}
          required
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Category focus</legend>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The pipeline assigns posts to authors whose focus covers the category.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {categories.map((category) => (
            <label key={category.slug} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="categoryFocus"
                value={category.slug}
                defaultChecked={author?.categoryFocus.includes(category.slug)}
                className="h-4 w-4 rounded border-input"
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton>{author?.id ? 'Save author' : 'Create author'}</SubmitButton>
        {onDone ? (
          <button type="button" onClick={onDone} className={buttonClass('ghost', 'md')}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
