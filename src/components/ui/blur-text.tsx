'use client';

import { useMemo, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Word- or letter-staggered blur-in text.
 *
 * Extracted from the supplied `portfolio-hero` reference so it can be reused.
 * Changes:
 *   - the full string is rendered into a visually hidden node and the animated
 *     spans are `aria-hidden`, so assistive tech and search crawlers read one
 *     clean sentence instead of a pile of one-letter spans;
 *   - honours `prefers-reduced-motion` by rendering the final state directly.
 *
 * The animation is CSS, not JavaScript. It used to start at `opacity: 0` and
 * wait for an IntersectionObserver callback to make it visible, which meant the
 * text was invisible to anything that never ran that callback — a crawler, a
 * failed hydration, a browser where the observer did not fire. The symptom was
 * an author page whose hero showed no name at all, which is also how the
 * person's name went missing from a page about them. `animation-fill-mode:
 * both` holds the final frame, so the resting state is visible text and the
 * worst case is text that appears without animating.
 */

interface BlurTextProps {
  text: string;
  delay?: number;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  className?: string;
  style?: CSSProperties;
  as?: 'p' | 'span' | 'h1' | 'h2';
}

export function BlurText({
  text,
  delay = 60,
  animateBy = 'words',
  direction = 'top',
  className,
  style,
  as: Tag = 'p',
}: BlurTextProps) {
  const reducedMotion = usePrefersReducedMotion();

  const segments = useMemo(
    () => (animateBy === 'words' ? text.split(' ') : [...text]),
    [text, animateBy],
  );

  if (reducedMotion) {
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag className={cn('inline-flex flex-wrap', className)} style={style}>
      {/* Real, uninterrupted text for screen readers and crawlers. */}
      <span className="sr-only">{text}</span>
      {segments.map((segment, i) => (
        <span
          key={`${segment}-${i}`}
          aria-hidden="true"
          style={
            {
              display: 'inline-block',
              animation: `blur-in 0.5s ease-out ${i * delay}ms both`,
              '--blur-in-from': direction === 'top' ? '-20px' : '20px',
            } as CSSProperties
          }
        >
          {segment}
          {animateBy === 'words' && i < segments.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

export default BlurText;
