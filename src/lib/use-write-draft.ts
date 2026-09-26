'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keeps a copy of the /write form in localStorage so a reload cannot cost
 * someone their article.
 *
 * Written after a contributor lost 1,533 words. The form has no account behind
 * it and no server-side draft, so the browser tab was the only copy — and a tab
 * is a fragile place to keep an hour's work. Three ways it goes: a reload, a
 * crash, or a deploy, which deletes the JavaScript chunks an open tab is still
 * running and turns the next click into a hard error.
 *
 * Text fields only. Files cannot be serialised, and a picture is cheap to
 * re-attach next to a piece that is cheap to lose.
 */

const KEY = 'favo:write-draft:v1';

/**
 * `body` is the one that matters; the rest are here because restoring the
 * article and then asking for the headline again would be a strange kindness.
 */
const FIELDS = [
  'title',
  'categoryId',
  'body',
  'authorName',
  'authorEmail',
  'authorBio',
  'authorUrl',
] as const;

type Draft = Partial<Record<(typeof FIELDS)[number], string>>;

/**
 * Writes a value the way a user typing would, so React sees it.
 *
 * Assigning `.value` on a controlled input updates the DOM and nothing else —
 * React's state still holds the old value and overwrites it on the next render.
 * Going through the prototype's setter and then dispatching the event React
 * actually listens for makes a restore indistinguishable from typing, which is
 * what the markdown editor needs to pick the body up.
 */
function setValueLikeAUser(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function field(form: HTMLFormElement, name: string) {
  const element = form.elements.namedItem(name);
  return element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
    ? element
    : null;
}

export function useWriteDraft(form: React.RefObject<HTMLFormElement | null>, submitted: boolean) {
  const [restored, setRestored] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // A browser with storage disabled or full simply has no draft. The form
      // still works; it just cannot be recovered.
    }
    setRestored(false);
  }, []);

  /** Throws the draft away and empties the form — "start fresh". */
  const discard = useCallback(() => {
    clear();
    const element = form.current;
    if (!element) return;
    for (const name of FIELDS) {
      const input = field(element, name);
      if (input) setValueLikeAUser(input, '');
    }
  }, [clear, form]);

  // Restore once, after mount. Reading localStorage during render would pull
  // the server and client markup apart and break hydration.
  useEffect(() => {
    const element = form.current;
    if (!element) return;

    let draft: Draft;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      draft = JSON.parse(raw) as Draft;
    } catch {
      return;
    }

    let filled = false;
    for (const name of FIELDS) {
      const value = draft[name];
      if (typeof value !== 'string' || value === '') continue;
      const input = field(element, name);
      if (!input) continue;
      setValueLikeAUser(input, value);
      if (name === 'body') filled = true;
    }

    // Only announce a restore that saved something worth mentioning. A stray
    // headline coming back does not need a banner.
    if (filled) setRestored(true);
  }, [form]);

  // Save on any edit, debounced — this runs on every keystroke otherwise.
  useEffect(() => {
    const element = form.current;
    if (!element) return;

    function save() {
      const current = form.current;
      if (!current) return;
      const draft: Draft = {};
      for (const name of FIELDS) {
        const input = field(current, name);
        if (input && input.value) draft[name] = input.value;
      }
      try {
        if (draft.body) localStorage.setItem(KEY, JSON.stringify(draft));
      } catch {
        // Quota exceeded, or storage blocked. Nothing to do but keep typing.
      }
    }

    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, 600);
    }

    element.addEventListener('input', schedule);
    element.addEventListener('change', schedule);
    return () => {
      element.removeEventListener('input', schedule);
      element.removeEventListener('change', schedule);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form]);

  // The article is with the editors; the local copy has done its job.
  useEffect(() => {
    if (submitted) clear();
  }, [submitted, clear]);

  return { restored, discard };
}
