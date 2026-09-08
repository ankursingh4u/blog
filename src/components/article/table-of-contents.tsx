'use client';

import { useEffect, useState } from 'react';
import type { TocEntry } from '@/lib/markdown';
import { cn } from '@/lib/utils';

/**
 * Sidebar contents with scroll-spy. The list is server-rendered from the
 * markdown source, so it exists (and the links work) before this component
 * hydrates — the only thing JavaScript adds is the active highlight.
 */
export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);

  useEffect(() => {
    if (entries.length === 0) return;

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // Top band only: a heading counts as "current" once it reaches the top
      // quarter of the viewport, which matches how people read.
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 3) return null;

  return (
    <nav aria-labelledby="toc-heading" className="text-sm">
      <p id="toc-heading" className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        On this page
      </p>
      <ul className="mt-4 space-y-1 border-l border-border">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={activeId === entry.id ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l py-1.5 pr-2 transition-colors',
                entry.level === 3 ? 'pl-7' : 'pl-4',
                activeId === entry.id
                  ? 'border-brand font-medium text-brand'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
