import { cache } from 'react';
import { prisma } from '@/lib/db';

export const SETTING_DEFAULTS = {
  POSTS_PER_DAY: '2',
  /**
   * Drafts a cycle asks for from each category.
   *
   * A cycle covers every vertical, so the run size is this times the number of
   * top-level categories, 2 across 8 verticals is 16 drafts, and four cycles a
   * day is 64. Lower this before lowering the cadence: fewer, better-sourced
   * drafts per section beats the same total spread thinner.
   */
  POSTS_PER_CATEGORY: '2',
  /**
   * Drafts per section in a cycle, overriding POSTS_PER_CATEGORY per slug.
   *
   * `sports:3,tech:3,money:3,gaming:1` and so on. A section set to 0 is skipped
   * entirely; one left out of the list falls back to POSTS_PER_CATEGORY. Empty
   * means every section gets the same number, which is where this started.
   *
   * It exists because an even spread across eight verticals is eight thin
   * sections, and thin sections do not rank. Depth in a few beats presence in
   * all of them, and which few is an editorial decision rather than a code one.
   */
  CYCLE_PLAN: '',
  /* ------------------------------------------------------- model per task */
  /**
   * Which model does which job. Empty means "use OPENAI_MODEL".
   *
   * Output tokens are roughly 88% of the bill, so the model that writes the
   * article is the bill. Writing, checking and naming are different jobs and
   * do not need the same model:
   *
   *   draft  , the article itself. The expensive one, and the one worth
   *             testing a smaller model on: judge it by the rejection rate,
   *             not by the invoice.
   *   review , scores a draft against text it has already been handed. It is
   *             comparison, not composition.
   *   meta   , titles and descriptions. Mechanical; the smallest model will do.
   *
   * A name this account cannot use falls back to OPENAI_MODEL and logs, rather
   * than failing every call, a cost setting must not be able to take the site's
   * generation down.
   */
  AI_MODEL_DRAFT: '',
  AI_MODEL_REVIEW: '',
  AI_MODEL_META: '',
  AUTO_PUBLISH: 'false',
  QUALITY_THRESHOLD: '85',
  // Topic-discovery channels beyond the Microsoft release feeds. All keyless.
  // Trends used to default off, on the reasoning that it was a spike detector
  // for a Windows story that broke a few times a year. Across eight
  // general-interest verticals it earns its request: daily trending searches are
  // mostly sport, film and celebrity, which the site now covers.
  DISCOVERY_NEWS: 'true',
  DISCOVERY_SUGGEST: 'true',
  DISCOVERY_TRENDS: 'true',
  SITE_TAGLINE: 'Trending stories, explained properly.',
  /**
   * Slug of the author every generated post is bylined to.
   *
   * Empty restores the original behaviour: round-robin among the house authors
   * whose categoryFocus covers the article's category. Set, it pins the byline
   * to one person, the publisher taking responsibility for the output rather
   * than a rota of personas.
   *
   * A slug that matches no author is ignored with a warning rather than failing
   * the run, so naming the setting before creating the author cannot break
   * generation. Existing posts are never touched; this only affects new ones.
   */
  /**
   * Pins every generated post to one byline. Empty by default, deliberately.
   *
   * It used to default to a slug, which meant the pin was switched on for
   * anyone who had never touched the setting: `getSetting` returns the default
   * when no row exists, so sport, health and education were all bylined to the
   * founder while the section map correctly handled the rest. Nobody had set
   * anything; the default was doing it. A seed task that cleared the *row*
   * found nothing to clear and said so.
   *
   * src/lib/bylines.ts decides who signs what now. Setting a slug here still
   * overrides the rotation, which is what it is for, but only if asked.
   */
  AI_AUTHOR_SLUG: '',
  AD_SLOT_HEADER: '',
  AD_SLOT_IN_ARTICLE: '',
  AD_SLOT_SIDEBAR: '',
  AD_SLOT_FOOTER: '',
  GA4_ID: '',
  /**
   * Google Tag Manager container (GTM-XXXXXXX). Empty renders nothing.
   *
   * Kept as a setting rather than a constant so a container can be pulled
   * immediately from /admin without waiting on a deploy, which is exactly the
   * situation this site has already been in once. A container is a channel for
   * running arbitrary JavaScript on every page, so whoever owns it owns the
   * front end: only ever point this at a container you control.
   */
  GTM_ID: '',
  GSC_VERIFICATION: '',
  INDEXNOW_KEY: '',
  /**
   * Ceiling on model tokens per calendar day. `0` disables the cap.
   *
   * Counted in tokens, not money, deliberately: tokens are what the API
   * reports, and a price converted here would be a number nobody maintains and
   * everybody trusts. `AI_TOKEN_PRICES` below turns it into an estimate only if
   * an operator supplies the rates.
   *
   * This is what makes an unattended schedule safe. Without it, a cron entry
   * that silently spends money is not something anyone can supervise.
   */
  DAILY_TOKEN_BUDGET: '400000',
  /**
   * Optional "inputPerMillion,outputPerMillion" in your billing currency, e.g.
   * "1.25,10". Empty means costs are simply not displayed, better than showing
   * an invented figure.
   */
  AI_TOKEN_PRICES: '',
  /* --------------------------------------------------- runtime state, not settings */
  /**
   * Today's token spend and the last run's summary.
   *
   * These are pipeline state rather than operator preferences, and they live
   * here because the deployment has no migration step, a new table would exist
   * in the generated Prisma client and not in the database. `saveSettings`
   * skips keys absent from the submitted form, so the admin form cannot clobber
   * them. When there is a migration path this wants to be a `PipelineRun`
   * table, which would also give a real history rather than only the last run.
   */
  USAGE_TODAY: '',
  LAST_RUN: '',
  /**
   * The open review cycle: its drafts, the cursor, and what has been decided.
   * Written by the pipeline and the Telegram webhook. See lib/review-queue.ts.
   */
  REVIEW_CYCLE: '',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export const AD_PLACEMENTS = [
  { key: 'AD_SLOT_HEADER', label: 'Header (below nav)' },
  { key: 'AD_SLOT_IN_ARTICLE', label: 'In-article (after Quick answer)' },
  { key: 'AD_SLOT_SIDEBAR', label: 'Sidebar (sticky)' },
  { key: 'AD_SLOT_FOOTER', label: 'Footer (above site footer)' },
] as const satisfies ReadonlyArray<{ key: SettingKey; label: string }>;

/** Deduped per request. Settings are read on nearly every page. */
export const getSettings = cache(async (): Promise<Record<SettingKey, string>> => {
  const rows = await prisma.setting.findMany();
  const map = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  for (const row of rows) {
    if (row.key in map) map[row.key as SettingKey] = row.value;
  }
  return map;
});

export async function getSetting(key: SettingKey): Promise<string> {
  const all = await getSettings();
  return all[key];
}

export async function setSetting(key: SettingKey, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export function asBool(value: string | undefined) {
  return value === 'true' || value === '1';
}

export function asInt(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}
