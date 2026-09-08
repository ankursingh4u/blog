'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * "Save for later", stored in the browser.
 *
 * There are no user accounts, so this lives in localStorage and is per-device by
 * design. Nothing is sent anywhere. A `storage` event listener keeps two open
 * tabs in step, and a custom event does the same for components in the same tab,
 * which the native event does not cover.
 */
const KEY = 'fixdesk:saved';
const CHANGED = 'fixdesk:saved-changed';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    // Private browsing, quota, or a corrupt value. Saving is a convenience, so
    // failing silently is better than breaking the page.
    return [];
  }
}

function write(slugs: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent(CHANGED));
  } catch {
    /* ignore — see read() */
  }
}

export function useSaved() {
  // Starts empty so server and first client render agree; the effect fills it in.
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSlugs(read());
    sync();
    setReady(true);

    window.addEventListener('storage', sync);
    window.addEventListener(CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGED, sync);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const current = read();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [slug, ...current].slice(0, 200);
    write(next);
    setSlugs(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setSlugs([]);
  }, []);

  return { slugs, ready, toggle, clear, isSaved: (slug: string) => slugs.includes(slug) };
}
