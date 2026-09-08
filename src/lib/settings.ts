import { cache } from 'react';
import { prisma } from '@/lib/db';

export const SETTING_DEFAULTS = {
  POSTS_PER_DAY: '2',
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
  AD_SLOT_HEADER: '',
  AD_SLOT_IN_ARTICLE: '',
  AD_SLOT_SIDEBAR: '',
  AD_SLOT_FOOTER: '',
  GA4_ID: '',
  GSC_VERIFICATION: '',
  INDEXNOW_KEY: '',
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
