'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DynamicFrameLayout, type Frame } from '@/components/ui/dynamic-frame-layout';

export interface CategoryTile {
  slug: string;
  name: string;
  description: string;
  count: number;
}

/**
 * The nine-cell frame grid: the eight sections plus one editorial tile.
 * Cells are plain links — the hover-expand is a flourish on top of a layout
 * that is fully navigable without it.
 *
 * Tiles deliberately carry no photography. They used to show the newest post's
 * featured image, but those are generated OG cards with the headline rendered
 * *into* the PNG, so every tile displayed a full article headline underneath
 * its own section label — two pieces of text stacked on top of each other. A
 * tinted wash keyed to the section's position gives each cell its own identity
 * without competing with the label.
 *
 * The layout is a fixed 3x3, so only nine cells fit. Eight sections leaves room
 * for exactly one more; About, the editorial policy and the RSS feed are all
 * reachable from the footer rather than being silently truncated here.
 */
export function CategoryGrid({ tiles }: { tiles: CategoryTile[] }) {
  const cells: Array<{ href: string; title: string; sub: string }> = [
    ...tiles.map((t) => ({
      href: `/${t.slug}`,
      title: t.name,
      sub: `${t.count} ${t.count === 1 ? 'article' : 'articles'}`,
    })),
    { href: '/search', title: 'Search', sub: 'Every section' },
  ].slice(0, 9);

  const frames: Frame[] = cells.map((cell, index) => ({
    id: cell.href,
    row: Math.floor(index / 3) as 0 | 1 | 2,
    col: (index % 3) as 0 | 1 | 2,
    media: {
      kind: 'node',
      node: (
        <div
          className="h-full w-full"
          // Hue is derived from the cell's position so each section keeps the
          // same wash between renders, and the sweep stays inside a narrow band
          // around the brand colour rather than turning into a rainbow.
          style={{
            backgroundImage:
              `linear-gradient(135deg, hsl(${262 + index * 14} 70% 62% / 0.28) 0%, ` +
              `hsl(${262 + index * 14} 60% 55% / 0.10) 45%, transparent 100%)`,
          }}
        />
      ),
    },
    overlay: (
      <div className="pointer-events-auto flex h-full flex-col justify-end bg-gradient-to-t from-background via-background/70 to-transparent p-4">
        <Link href={cell.href} className="group/tile">
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            {cell.title}
            <ArrowUpRight
              className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/tile:opacity-100"
              aria-hidden="true"
            />
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{cell.sub}</p>
        </Link>
      </div>
    ),
  }));

  return (
    <DynamicFrameLayout frames={frames} className="h-[34rem] md:h-[30rem]" hoverSize={6} gapSize={8} />
  );
}
