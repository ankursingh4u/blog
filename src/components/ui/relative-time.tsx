'use client';

import { useEffect, useState } from 'react';
import { formatDate, isoDate } from '@/lib/utils';

/**
 * "2 hours ago", the way news aggregators show recency.
 *
 * The server cannot know the reader's clock, and rendering a relative string on
 * the server would produce a hydration mismatch (and go stale in a cached page).
 * So the absolute date is rendered first — which is also what a crawler and a
 * reader with JavaScript disabled get — and swapped for the relative form after
 * mount.
 */
const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

function relative(from: Date, now: Date): string {
  const formatter = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  let duration = (from.getTime() - now.getTime()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return formatter.format(Math.round(duration), 'year');
}

export function RelativeTime({
  value,
  className,
}: {
  value: Date | string | null | undefined;
  className?: string;
}) {
  const absolute = formatDate(value);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return;

    const tick = () => setLabel(relative(date, new Date()));
    tick();

    // Anything published within the last hour is worth re-rendering as it ages.
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [value]);

  if (!absolute) return null;

  return (
    <time dateTime={isoDate(value)} title={absolute} className={className} suppressHydrationWarning>
      {label ?? absolute}
    </time>
  );
}
