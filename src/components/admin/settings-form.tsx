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
            label="Daily token cap"
            htmlFor="DAILY_TOKEN_BUDGET"
            hint="A run stops once today's tokens pass this. 0 removes the cap."
          >
            <input
              id="DAILY_TOKEN_BUDGET"
              name="DAILY_TOKEN_BUDGET"
              inputMode="numeric"
              defaultValue={values.DAILY_TOKEN_BUDGET}
              className={inputClass}
              placeholder="400000"
            />
          </Field>

          <Field
            label="Token prices (optional)"
            htmlFor="AI_TOKEN_PRICES"
            hint="input,output per million — e.g. 1.25,10. Empty hides cost estimates rather than guessing."
          >
            <input
              id="AI_TOKEN_PRICES"
              name="AI_TOKEN_PRICES"
              defaultValue={values.AI_TOKEN_PRICES}
              className={inputClass}
              placeholder="1.25,10"
            />
          </Field>

          <Field
            label="Drafts per category, per cycle"
            htmlFor="POSTS_PER_CATEGORY"
            hint="A cycle covers all 8 verticals, so 2 here is 16 articles a cycle."
          >
            <input
              id="POSTS_PER_CATEGORY"
              name="POSTS_PER_CATEGORY"
              inputMode="numeric"
              defaultValue={values.POSTS_PER_CATEGORY}
              className={inputClass}
              placeholder="2"
            />
          </Field>

          {/*
            Model per job. Output tokens are most of the bill, so the model that
            writes the article is the lever worth pulling — and the only honest
            way to judge a cheaper one is the rejection rate, not the invoice.
          */}
          <Field
            label="Model — writing"
            htmlFor="AI_MODEL_DRAFT"
            hint="Empty uses OPENAI_MODEL. A smaller model here is the biggest saving available."
          >
            <input
              id="AI_MODEL_DRAFT"
              name="AI_MODEL_DRAFT"
              defaultValue={values.AI_MODEL_DRAFT}
              className={inputClass}
              placeholder="gpt-5.4-mini"
            />
          </Field>

          <Field
            label="Model — quality review"
            htmlFor="AI_MODEL_REVIEW"
            hint="Compares a draft against its sources. Comparison, not composition."
          >
            <input
              id="AI_MODEL_REVIEW"
              name="AI_MODEL_REVIEW"
              defaultValue={values.AI_MODEL_REVIEW}
              className={inputClass}
              placeholder="gpt-5.4-mini"
            />
          </Field>

          <Field
            label="Model — titles and descriptions"
            htmlFor="AI_MODEL_META"
            hint="Mechanical work; the smallest model will do."
          >
            <input
              id="AI_MODEL_META"
              name="AI_MODEL_META"
              defaultValue={values.AI_MODEL_META}
              className={inputClass}
              placeholder="gpt-5.4-nano"
            />
          </Field>

          <Field
            label="Byline for generated posts"
            htmlFor="AI_AUTHOR_SLUG"
            hint="Author slug. Empty rotates among the house authors as before. Existing posts are never changed."
          >
            <input
              id="AI_AUTHOR_SLUG"
              name="AI_AUTHOR_SLUG"
              defaultValue={values.AI_AUTHOR_SLUG}
              className={inputClass}
              placeholder="ankur-singh"
            />
          </Field>

          <Field
            label="Tag Manager container"
            htmlFor="GTM_ID"
            hint="Only a container you own — it can run any script on every page. Clear it to remove."
          >
            <input
              id="GTM_ID"
              name="GTM_ID"
              defaultValue={values.GTM_ID}
              className={inputClass}
              placeholder="GTM-XXXXXXX"
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
