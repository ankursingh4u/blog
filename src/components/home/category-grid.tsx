'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DynamicFrameLayout, type Frame } from '@/components/ui/dynamic-frame-layout';

export interface CategoryTile {
  slug: string;
  name: string;
  description: string;
  count: number;
  /** Newest cover photograph in the section, or null to fall back to a wash. */
  image: string | null;
}

/**
 * The nine-cell frame grid: the eight sections plus one editorial tile.
 * Cells are plain links — the hover-expand is a flourish on top of a layout
 * that is fully navigable without it.
 *
 * Each tile shows the newest cover photograph from its section. That was not
 * possible while `featuredImage` held a generated OG card: the headline is drawn
 * into the PNG, so every tile carried a full article headline underneath its own
 * section label. Now that covers are photographs with no text in them, the
 * objection is gone, and nine empty washes in a row read as a broken grid rather
 * than a restrained one.
 *
 * Sections with no photographed article yet keep the tinted wash, keyed to the
 * cell's position so it stays stable between renders.
 *
 * The layout is a fixed 3x3, so only nine cells fit. Eight sections leaves room
 * for exactly one more; About, the editorial policy and the RSS feed are all
 * reachable from the footer rather than being silently truncated here.
 */
export function CategoryGrid({ tiles }: { tiles: CategoryTile[] }) {
  const cells: Array<{ href: string; title: string; sub: string; image: string | null }> = [
    ...tiles.map((t) => ({
      href: `/${t.slug}`,
      title: t.name,
      sub: `${t.count} ${t.count === 1 ? 'article' : 'articles'}`,
      image: t.image,
    })),
    { href: '/search', title: 'Search', sub: 'Every section', image: null },
  ].slice(0, 9);

  const frames: Frame[] = cells.map((cell, index) => ({
    id: cell.href,
    row: Math.floor(index / 3) as 0 | 1 | 2,
    col: (index % 3) as 0 | 1 | 2,
    media: {
      kind: 'node',
      node: cell.image ? (
        <div className="relative h-full w-full">
          <Image
            src={cell.image}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
          {/* Darkened so the label stays legible over any photograph. */}
          <div className="absolute inset-0 bg-background/35" />
        </div>
      ) : (
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
