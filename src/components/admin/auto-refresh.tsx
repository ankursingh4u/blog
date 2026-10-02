'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Re-fetches the current admin page on an interval.
 *
 * Every admin page is `force-dynamic`, so it is correct the moment it loads and
 * frozen afterwards. That is fine for a form and wrong for a queue: decisions
 * now arrive from a Telegram group, so the dashboard on a desk goes stale the
 * instant somebody approves a draft on their phone, and the first sign of it is
 * an editor acting on a post that was dealt with ten minutes ago.
 *
 * `router.refresh()` re-runs the server render and reconciles, so typing in a
 * form field is not interrupted and scroll position is kept. It is not a
 * websocket and does not pretend to be; a few seconds of staleness on a review
 * queue costs nothing, and a persistent connection for this would be a lot of
 * machinery for a page two people look at.
 *
 * Paused while the tab is hidden. A dashboard left open overnight should not
 * poll a database eight hundred times for nobody.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };

    const timer = setInterval(tick, seconds * 1000);
    // Catch up immediately when the tab comes back, rather than waiting out the
    // remainder of an interval that elapsed while nobody was looking.
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, seconds]);

  return null;
}

export default AutoRefresh;
