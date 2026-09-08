'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef } from 'react';
import { useInView, usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Physics pile of error-code chips.
 *
 * Matter.js is ~85 KB of client JavaScript for a decorative section, so it is
 * code-split and only requested once the section is within 300px of the
 * viewport. The server-rendered HTML — and therefore what a crawler sees — is
 * always the plain wrapped list of links. Anyone with reduced motion on, or
 * who never scrolls this far, keeps that version permanently.
 *
 * The chips stay real `<Link>`s in the physics version too: `Gravity` runs in
 * non-draggable mode so its canvas is click-through, which means the falling
 * pills are still navigable and keyboard-focusable.
 */
const Gravity = dynamic(() => import('@/components/ui/gravity').then((m) => m.Gravity), {
  ssr: false,
});
const MatterBody = dynamic(() => import('@/components/ui/gravity').then((m) => m.MatterBody), {
  ssr: false,
});

export interface CodeChip {
  label: string;
  href: string;
}

const PALETTE = [
  'bg-violet-600',
  'bg-cyan-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-orange-600',
  'bg-fuchsia-600',
];

const chipClass = (i: number) =>
  `inline-block whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
    PALETTE[i % PALETTE.length]
  }`;

export function ErrorCodeCloud({ chips }: { chips: CodeChip[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(ref, { rootMargin: '300px', once: true });
  const usePhysics = inView && !reducedMotion && chips.length > 0;

  return (
    <div
      ref={ref}
      className="relative min-h-[22rem] overflow-hidden rounded-lg border border-border bg-muted/30"
    >
      {usePhysics ? (
        <Gravity gravity={{ x: 0, y: 1 }} draggable={false} grabCursor={false} className="h-full w-full">
          {chips.map((chip, i) => (
            <MatterBody
              key={chip.href}
              isDraggable={false}
              matterBodyOptions={{ friction: 0.45, restitution: 0.25 }}
              x={`${14 + ((i * 23) % 72)}%`}
              y={`${4 + ((i * 17) % 30)}%`}
              angle={((i % 5) - 2) * 8}
            >
              <Link href={chip.href} className={chipClass(i)}>
                {chip.label}
              </Link>
            </MatterBody>
          ))}
        </Gravity>
      ) : (
        <ul className="flex flex-wrap content-start gap-3 p-6">
          {chips.map((chip, i) => (
            <li key={chip.href}>
              <Link href={chip.href} className={chipClass(i)}>
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
