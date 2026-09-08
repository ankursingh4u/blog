'use client';

import { useActionState } from 'react';
import { saveSettings, type ActionState } from '@/lib/admin/actions';
import {
  EMPTY_STATE,
  Field,
  FormMessage,
  SubmitButton,
  inputClass,
  textareaClass,
} from '@/components/admin/form-controls';
import { AD_PLACEMENTS, type SettingKey } from '@/lib/settings';

export function SettingsForm({ values }: { values: Record<SettingKey, string> }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettings, EMPTY_STATE);

  return (
    <form action={action} className="space-y-8">
      <FormMessage state={state} />

      <section className="surface space-y-5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Posts per run"
            htmlFor="POSTS_PER_DAY"
            hint="Capped at 3 by the pipeline."
          >
            <input
              id="POSTS_PER_DAY"
              name="POSTS_PER_DAY"
              type="number"
              min={1}
              max={3}
              defaultValue={values.POSTS_PER_DAY}
              className={inputClass}
            />
          </Field>

          <Field
            label="Auto-publish"
            htmlFor="AUTO_PUBLISH"
            hint="Off means everything lands in review."
          >
            <select
              id="AUTO_PUBLISH"
              name="AUTO_PUBLISH"
              defaultValue={values.AUTO_PUBLISH}
              className={inputClass}
            >
              <option value="false">Off — human publishes</option>
              <option value="true">On — publish above the threshold</option>
            </select>
          </Field>

          <Field
            label="Quality threshold"
            htmlFor="QUALITY_THRESHOLD"
            hint="Score needed to auto-publish."
          >
            <input
              id="QUALITY_THRESHOLD"
              name="QUALITY_THRESHOLD"
              type="number"
              min={0}
              max={100}
              defaultValue={values.QUALITY_THRESHOLD}
              className={inputClass}
            />
          </Field>
        </div>

        <p className="rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
          Auto-publish never overrides the identifier check. A draft that names a KB number, build
          or error code absent from its sources is held for review at any score.
        </p>
      </section>

      <section className="surface space-y-5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Topic discovery
        </h2>
        <p className="text-xs text-muted-foreground">
          Extra channels the daily run uses to find topics, on top of the Microsoft release feeds.
          All three are keyless public endpoints — there is no account to set up.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Google News"
            htmlFor="DISCOVERY_NEWS"
            hint="News RSS search. There is no official Google News API; this is the public feed."
          >
            <select
              id="DISCOVERY_NEWS"
              name="DISCOVERY_NEWS"
              defaultValue={values.DISCOVERY_NEWS}
              className={inputClass}
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </Field>

          <Field
            label="Google autocomplete"
            htmlFor="DISCOVERY_SUGGEST"
            hint="Real search phrases people type. The highest-yield channel of the three."
          >
            <select
              id="DISCOVERY_SUGGEST"
              name="DISCOVERY_SUGGEST"
              defaultValue={values.DISCOVERY_SUGGEST}
              className={inputClass}
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </Field>

          <Field
            label="Google Trends"
            htmlFor="DISCOVERY_TRENDS"
            hint="Daily trending searches. Usually returns nothing Windows-related — that is normal."
          >
            <select
              id="DISCOVERY_TRENDS"
              name="DISCOVERY_TRENDS"
              defaultValue={values.DISCOVERY_TRENDS}
              className={inputClass}
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </Field>
        </div>

        <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Only the Microsoft feeds are trusted for identifiers. Topics found through these channels
          carry only the KB numbers and error codes written in the search phrase itself, and the
          quality gate still checks every identifier against the research sources before anything
          can publish.
        </p>
      </section>

      <section className="surface space-y-5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Site
        </h2>

        <Field label="Tagline" htmlFor="SITE_TAGLINE" hint="Shown in the hero and the footer.">
          <input
            id="SITE_TAGLINE"
            name="SITE_TAGLINE"
            defaultValue={values.SITE_TAGLINE}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="surface space-y-5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ad placements
        </h2>
        <p className="text-xs text-muted-foreground">
          First-party HTML, inserted as-is into a height-reserved container. Leave a slot empty and
          it renders nothing at all — no placeholder, no reserved gap.
        </p>

        {AD_PLACEMENTS.map((placement) => (
          <Field key={placement.key} label={placement.label} htmlFor={placement.key}>
            <textarea
              id={placement.key}
              name={placement.key}
              defaultValue={values[placement.key]}
              rows={3}
              className={textareaClass}
              placeholder="<a href=…><img src=… width=728 height=90 alt=…></a>"
            />
          </Field>
        ))}
      </section>

      <section className="surface space-y-5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Search & analytics
        </h2>
        <p className="text-xs text-muted-foreground">
          These are inert while the site runs on localhost.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="GA4 measurement ID" htmlFor="GA4_ID">
            <input
              id="GA4_ID"
              name="GA4_ID"
              defaultValue={values.GA4_ID}
              className={inputClass}
              placeholder="G-XXXXXXXXXX"
            />
          </Field>

          <Field
            label="Search Console token"
            htmlFor="GSC_VERIFICATION"
            hint="The content= value only."
          >
            <input
              id="GSC_VERIFICATION"
              name="GSC_VERIFICATION"
              defaultValue={values.GSC_VERIFICATION}
              className={inputClass}
            />
          </Field>

          <Field
            label="IndexNow key"
            htmlFor="INDEXNOW_KEY"
            hint="Served at /{key}.txt once set."
          >
            <input
              id="INDEXNOW_KEY"
              name="INDEXNOW_KEY"
              defaultValue={values.INDEXNOW_KEY}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-4 rounded-lg border border-border bg-background/95 p-4 backdrop-blur">
        <SubmitButton size="lg">Save settings</SubmitButton>
      </div>
    </form>
  );
}
