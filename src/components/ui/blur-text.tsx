'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
 *   - the IntersectionObserver cleanup captures the node instead of reading
 *     `ref.current` at teardown, which is stale by then and silently leaks;
 *   - honours `prefers-reduced-motion` by rendering the final state directly.
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
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  const shown = inView;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn('inline-flex flex-wrap', className)}
      style={style}
    >
      {/* Real, uninterrupted text for screen readers and crawlers. */}
      <span className="sr-only">{text}</span>
      {segments.map((segment, i) => (
        <span
          key={`${segment}-${i}`}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            filter: shown ? 'blur(0px)' : 'blur(10px)',
            opacity: shown ? 1 : 0,
            transform: shown
              ? 'translateY(0)'
              : `translateY(${direction === 'top' ? '-20px' : '20px'})`,
            transition: `filter 0.5s ease-out ${i * delay}ms, opacity 0.5s ease-out ${
              i * delay
            }ms, transform 0.5s ease-out ${i * delay}ms`,
          }}
        >
          {segment}
          {animateBy === 'words' && i < segments.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

export default BlurText;
