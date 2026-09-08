import { getSettings, type SettingKey } from '@/lib/settings';
import { cn } from '@/lib/utils';

/**
 * Self-managed display ad placement.
 *
 * The HTML comes from a Setting an operator pastes in /admin/settings — it is
 * first-party markup, not third-party script injection, and no ad network is
 * involved. Two things matter here for Core Web Vitals:
 *   1. the slot reserves its height before the markup renders, so a late-
 *      loading creative cannot shift the article;
 *   2. an empty setting renders nothing at all — no empty box, no reserved gap.
 */

const SIZES = {
  leaderboard: 'min-h-[90px]',
  rectangle: 'min-h-[250px]',
  skyscraper: 'min-h-[600px]',
} as const;

export async function AdSlot({
  placement,
  size = 'leaderboard',
  className,
}: {
  placement: SettingKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const settings = await getSettings();
  const html = settings[placement]?.trim();
  if (!html) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={cn(
        'not-prose flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40',
        SIZES[size],
        className,
      )}
    >
      <div
        className="flex w-full items-center justify-center"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </aside>
  );
}
