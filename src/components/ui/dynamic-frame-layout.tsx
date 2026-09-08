'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Hover-expanding 3×3 frame grid.
 *
 * Adapted from the supplied `dynamic-frame-layout` reference. Changes:
 *   - media is a discriminated union (`image` | `video` | `node`) instead of
 *     video-only, because a text blog has category art, not showreels;
 *   - the decorative corner/edge sprites are optional — the default look uses
 *     a CSS border, so the grid needs no image assets to render correctly;
 *   - grid position is derived from an explicit row/col rather than pixel
 *     coordinates, which removes the `/4` magic numbers;
 *   - collapses to a single column below `md`, where hover does not exist;
 *   - `prefers-reduced-motion` freezes the track sizes so nothing resizes.
 */

export interface FrameMedia {
  kind: 'image' | 'video' | 'node';
  /** Required for image/video. */
  src?: string;
  poster?: string;
  alt?: string;
  node?: ReactNode;
}

export interface Frame {
  id: string | number;
  row: 0 | 1 | 2;
  col: 0 | 1 | 2;
  media: FrameMedia;
  /** Overlay rendered above the media — title, count, link. */
  overlay?: ReactNode;
  href?: string;
  /** Zoom applied to the media itself; 1 = fit. */
  mediaSize?: number;
  edges?: {
    corner: string;
    horizontal: string;
    vertical: string;
    thickness: number;
    /** Inset of the framed media as a percentage of the cell. */
    size: number;
  };
}

interface DynamicFrameLayoutProps {
  frames: Frame[];
  className?: string;
  /** fr units given to the hovered track. Total across three tracks is 12. */
  hoverSize?: number;
  gapSize?: number;
}

export function DynamicFrameLayout({
  frames,
  className,
  hoverSize = 6,
  gapSize = 8,
}: DynamicFrameLayoutProps) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  // Below md there is no hover, and three columns would make each tile
  // unreadable — the grid becomes a plain stack with fixed-height cells.
  const isStacked = useIsMobile(767);

  const trackSizes = (axis: 'row' | 'col') => {
    if (hovered === null || reducedMotion) return '4fr 4fr 4fr';
    const active = hovered[axis];
    const rest = (12 - hoverSize) / 2;
    return [0, 1, 2].map((i) => `${i === active ? hoverSize : rest}fr`).join(' ');
  };

  return (
    <div
      className={cn('relative w-full', className)}
      style={{
        display: 'grid',
        gridTemplateRows: isStacked ? undefined : trackSizes('row'),
        gridAutoRows: isStacked ? 'minmax(9rem, auto)' : undefined,
        gridTemplateColumns: isStacked ? '1fr' : trackSizes('col'),
        gap: `${gapSize}px`,
        transition:
          reducedMotion || isStacked
            ? undefined
            : 'grid-template-rows 0.4s ease, grid-template-columns 0.4s ease',
      }}
      onMouseLeave={() => setHovered(null)}
    >
      {frames.map((frame) => (
        <motion.div
          key={frame.id}
          className="relative min-h-0 min-w-0"
          style={{
            gridRow: isStacked ? 'auto' : frame.row + 1,
            gridColumn: isStacked ? 'auto' : frame.col + 1,
            transformOrigin: `${['top', 'center', 'bottom'][frame.row]} ${
              ['left', 'center', 'right'][frame.col]
            }`,
          }}
          onMouseEnter={() => setHovered({ row: frame.row, col: frame.col })}
          onFocusCapture={() => setHovered({ row: frame.row, col: frame.col })}
        >
          <FrameCell
            frame={frame}
            isHovered={hovered?.row === frame.row && hovered?.col === frame.col}
          />
        </motion.div>
      ))}
    </div>
  );
}

function FrameCell({ frame, isHovered }: { frame: Frame; isHovered: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Video only plays while its cell is hovered — nine autoplaying loops would
  // saturate the main thread and destroy INP.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isHovered && !reducedMotion) void video.play().catch(() => undefined);
    else video.pause();
  }, [isHovered, reducedMotion]);

  const { media, edges, mediaSize = 1 } = frame;
  const framed = Boolean(edges);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          zIndex: 1,
          transition: 'all 0.3s ease-in-out',
          padding: framed ? `${edges!.thickness}px` : 0,
          width: framed ? `${edges!.size}%` : '100%',
          height: framed ? `${edges!.size}%` : '100%',
          left: framed ? `${(100 - edges!.size) / 2}%` : 0,
          top: framed ? `${(100 - edges!.size) / 2}%` : 0,
        }}
      >
        <div
          className="h-full w-full overflow-hidden"
          style={{
            transform: `scale(${isHovered && !reducedMotion ? mediaSize * 1.04 : mediaSize})`,
            transformOrigin: 'center',
            transition: 'transform 0.4s ease-in-out',
          }}
        >
          {media.kind === 'video' ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={media.src}
              poster={media.poster}
              loop
              muted
              playsInline
              preload="none"
              aria-hidden="true"
            />
          ) : media.kind === 'image' ? (
            // Plain <img>: these tiles are decorative, sized by the grid, and
            // next/image's fill mode fights the animated track sizes.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.src}
              alt={media.alt ?? ''}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            media.node
          )}
        </div>
      </div>

      {framed ? <FrameEdges edges={edges!} /> : null}

      {frame.overlay ? (
        <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col justify-end">
          {frame.overlay}
        </div>
      ) : null}
    </div>
  );
}

function FrameEdges({ edges }: { edges: NonNullable<Frame['edges']> }) {
  const corner = (style: string) => (
    <div
      className="absolute h-16 w-16 bg-contain bg-no-repeat"
      style={{ backgroundImage: `url(${edges.corner})`, transform: style }}
    />
  );

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 2 }} aria-hidden="true">
      <div className="absolute left-0 top-0">{corner('none')}</div>
      <div className="absolute right-0 top-0">{corner('scaleX(-1)')}</div>
      <div className="absolute bottom-0 left-0">{corner('scaleY(-1)')}</div>
      <div className="absolute bottom-0 right-0">{corner('scale(-1, -1)')}</div>

      <div
        className="absolute left-16 right-16 top-0 h-16"
        style={{
          backgroundImage: `url(${edges.horizontal})`,
          backgroundSize: 'auto 64px',
          backgroundRepeat: 'repeat-x',
        }}
      />
      <div
        className="absolute bottom-0 left-16 right-16 h-16"
        style={{
          backgroundImage: `url(${edges.horizontal})`,
          backgroundSize: 'auto 64px',
          backgroundRepeat: 'repeat-x',
          transform: 'rotate(180deg)',
        }}
      />
      <div
        className="absolute bottom-16 left-0 top-16 w-16"
        style={{
          backgroundImage: `url(${edges.vertical})`,
          backgroundSize: '64px auto',
          backgroundRepeat: 'repeat-y',
        }}
      />
      <div
        className="absolute bottom-16 right-0 top-16 w-16"
        style={{
          backgroundImage: `url(${edges.vertical})`,
          backgroundSize: '64px auto',
          backgroundRepeat: 'repeat-y',
          transform: 'scaleX(-1)',
        }}
      />
    </div>
  );
}

export default DynamicFrameLayout;
