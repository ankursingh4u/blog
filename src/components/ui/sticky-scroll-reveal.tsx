'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Sticky scroll reveal: a scrolling column of steps beside a panel that swaps
 * as each step becomes active.
 *
 * Adapted from the supplied `sticky-scroll-reveal` reference. Changes:
 *   - inactive steps fade to 0.55 rather than 0.3, so every step still clears
 *     contrast minimums — the effect is emphasis, not hiding content;
 *   - colours come from the theme tokens instead of hard-coded slate/black, so
 *     it works in light mode;
 *   - the panel is driven by the active index with a crossfade and is marked
 *     `aria-hidden`; the steps themselves carry all the text;
 *   - under `prefers-reduced-motion` the internal scroll container is dropped
 *     entirely and every step renders at full opacity in normal page flow.
 */

export interface StickyScrollItem {
  title: string;
  description: string;
  /** Panel content shown while this item is active. Decorative. */
  content?: ReactNode;
}

interface StickyScrollProps {
  content: StickyScrollItem[];
  className?: string;
  contentClassName?: string;
}

export function StickyScroll({ content, className, contentClassName }: StickyScrollProps) {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ['start start', 'end start'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const breakpoints = content.map((_, index) => index / content.length);
    const closest = breakpoints.reduce(
      (acc, breakpoint, index) =>
        Math.abs(latest - breakpoint) < Math.abs(latest - breakpoints[acc]) ? index : acc,
      0,
    );
    setActiveCard(closest);
  });

  if (reducedMotion) {
    return (
      <ol className={cn('grid gap-8 sm:grid-cols-2', className)}>
        {content.map((item, index) => (
          <li key={item.title} className="surface p-6">
            <p className="font-mono text-xs text-brand">Step {index + 1}</p>
            <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'surface relative flex h-[30rem] justify-center gap-10 overflow-y-auto p-6 sm:p-10',
        className,
      )}
    >
      <ol className="relative flex max-w-2xl items-start">
        <div>
          {content.map((item, index) => (
            <li key={item.title} className="my-16 first:mt-4 list-none">
              <motion.p
                animate={{ opacity: activeCard === index ? 1 : 0.55 }}
                className="font-mono text-xs uppercase tracking-widest text-brand"
              >
                Step {index + 1}
              </motion.p>
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.55 }}
                className="mt-2 text-2xl font-bold tracking-tight"
              >
                {item.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.55 }}
                className="mt-4 max-w-md text-muted-foreground"
              >
                {item.description}
              </motion.p>
            </li>
          ))}
          <div className="h-32" />
        </div>
      </ol>

      <div
        aria-hidden="true"
        className={cn(
          'sticky top-4 hidden h-64 w-80 shrink-0 overflow-hidden rounded-lg border border-border lg:block',
          contentClassName,
        )}
      >
        {content.map((item, index) => (
          <motion.div
            key={item.title}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: activeCard === index ? 1 : 0 }}
            transition={{ duration: 0.35 }}
            style={{ pointerEvents: activeCard === index ? 'auto' : 'none' }}
          >
            {item.content ?? <DefaultPanel index={index} title={item.title} />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DefaultPanel({ index, title }: { index: number; title: string }) {
  const gradients = [
    'from-violet-500 to-indigo-600',
    'from-cyan-500 to-emerald-500',
    'from-orange-500 to-amber-400',
    'from-rose-500 to-pink-600',
  ];
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-gradient-to-br p-6 text-center text-lg font-semibold text-white',
        gradients[index % gradients.length],
      )}
    >
      {title}
    </div>
  );
}

/** Progress dots for the sticky panel, exported for reuse in section headers. */
export function StickyProgress({ total, active }: { total: number; active: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === active ? 'w-6 bg-brand' : 'w-1.5 bg-border',
          )}
        />
      ))}
    </div>
  );
}

export default StickyScroll;
