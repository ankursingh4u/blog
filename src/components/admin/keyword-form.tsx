'use client';

import { useActionState } from 'react';
import { addKeyword, type ActionState } from '@/lib/admin/actions';
import {
  EMPTY_STATE,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
} from '@/components/admin/form-controls';

export function KeywordForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState<ActionState, FormData>(addKeyword, EMPTY_STATE);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Phrase"
          htmlFor="phrase"
          hint="What someone would type into Google."
          error={errors.phrase}
        >
          <input
            id="phrase"
            name="phrase"
            className={inputClass}
            placeholder="How to fix 0x80070002 in Windows 11"
            required
          />
        </Field>

        <Field label="Category" htmlFor="categoryId">
          <select id="categoryId" name="categoryId" className={inputClass} defaultValue="">
            <option value="">Let the pipeline decide</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-medium">
          Verified identifiers{' '}
          <span className="font-normal text-muted-foreground">
            — only fill these in if you have confirmed them against Microsoft
          </span>
        </legend>

        <Field label="KB number" htmlFor="kbNumber">
          <input id="kbNumber" name="kbNumber" className={inputClass} placeholder="KB5044284" />
        </Field>
        <Field label="Build number" htmlFor="buildNumber">
          <input
            id="buildNumber"
            name="buildNumber"
            className={inputClass}
            placeholder="26100.2314"
          />
        </Field>
        <Field label="Error code" htmlFor="errorCode">
          <input id="errorCode" name="errorCode" className={inputClass} placeholder="0x800f0922" />
        </Field>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Anything you enter here becomes an identifier the generator is allowed to use. Leave a
        field blank rather than guessing — the quality gate blocks unverified identifiers, and a
        wrong one entered here would sail straight through it.
      </p>

      <SubmitButton>Add to queue</SubmitButton>
    </form>
  );
}
