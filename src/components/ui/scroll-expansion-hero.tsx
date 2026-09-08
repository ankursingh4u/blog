'use client';

import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Scroll-expansion hero: a small media card that grows to fill the frame as
 * the reader scrolls, while the split title slides apart.
 *
 * Adapted from the supplied `scroll-expansion-hero` reference — with one
 * deliberate behavioural change.
 *
 * The reference drives the effect by hijacking the page: it calls
 * `preventDefault()` on every wheel event and forces `window.scrollTo(0, 0)`
 * on every scroll until the animation completes. That traps the reader — Page
 * Down, Home/End, spacebar, screen-reader navigation and find-in-page all stop
 * working until the sequence finishes, and there is no way out with the
 * keyboard at all. On a site whose job is to get someone to a fix quickly,
 * that is not a trade worth making.
 *
 * This version produces the same visual by scrubbing the animation off a tall
 * sticky container's own scroll progress. Native scrolling is never blocked,
 * every input device works, and the reader can leave at any time. Under
 * `prefers-reduced-motion` the media renders at full size immediately and the
 * spacer collapses.
 */

interface ScrollExpandMediaProps {
  mediaType?: 'image' | 'video';
  mediaSrc: string;
  posterSrc?: string;
  bgImageSrc: string;
  title?: string;
  date?: string;
  scrollToExpand?: string;
  /** Blends the title against the media instead of sitting over it. */
  textBlend?: boolean;
  children?: ReactNode;
  className?: string;
}

export function ScrollExpandMedia({
  mediaType = 'image',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
  className,
}: ScrollExpandMediaProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();

  // Progress runs 0 → 1 across the section's own scroll distance.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const mediaWidth = useTransform(scrollYProgress, [0, 1], isMobile ? [300, 950] : [420, 1670]);
  const mediaHeight = useTransform(scrollYProgress, [0, 1], isMobile ? [340, 540] : [420, 820]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.55, 0.2]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const contentOpacity = useTransform(scrollYProgress, [0.75, 1], [0, 1]);
  // Both title halves are derived here rather than inline in JSX: `reducedMotion`
  // can flip at runtime, and the early return below must not change hook order.
  const shift = isMobile ? 42 : 34;
  const titleShiftRight = useTransform(scrollYProgress, [0, 1], ['0vw', `${shift}vw`]);
  const titleShiftLeft = useTransform(scrollYProgress, [0, 1], ['0vw', `-${shift}vw`]);

  const firstWord = title ? title.split(' ')[0] : '';
  const restOfTitle = title ? title.split(' ').slice(1).join(' ') : '';

  if (reducedMotion) {
    return (
      <section className={cn('relative overflow-hidden', className)}>
        <div className="relative mx-auto max-w-6xl px-4 py-16">
          {title ? (
            <h2 className="text-balance text-center text-4xl font-bold tracking-tight md:text-5xl">
              {title}
            </h2>
          ) : null}
          {date ? <p className="mt-2 text-center text-muted-foreground">{date}</p> : null}
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-border">
            <Media mediaType={mediaType} mediaSrc={mediaSrc} posterSrc={posterSrc} title={title} />
          </div>
          <div className="mt-12">{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={cn('relative h-[260vh] overflow-x-clip', className)}
      aria-label={title}
    >
      <div className="sticky top-0 flex h-[100svh] w-full items-center justify-center overflow-hidden">
        {/* Background plate — fades out as the media takes over. */}
        <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 z-0" aria-hidden="true">
          <Image
            src={bgImageSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-background/40" />
        </motion.div>

        {/* Expanding media card. */}
        <motion.div
          className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: mediaWidth,
            height: mediaHeight,
            maxWidth: '95vw',
            maxHeight: '82svh',
          }}
        >
          <Media mediaType={mediaType} mediaSrc={mediaSrc} posterSrc={posterSrc} title={title} />
          <motion.div
            className="absolute inset-0 bg-black"
            style={{ opacity: overlayOpacity }}
            aria-hidden="true"
          />
        </motion.div>

        {/* Split title. `mix-blend-difference` keeps it legible over any frame. */}
        <div
          className={cn(
            'pointer-events-none relative z-10 flex w-full flex-col items-center gap-3 px-4 text-center',
            textBlend ? 'mix-blend-difference' : '',
          )}
        >
          <motion.h2
            style={{ x: titleShiftLeft }}
            className="text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-6xl"
          >
            {firstWord}
          </motion.h2>
          <motion.h2
            style={{ x: titleShiftRight }}
            className="text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-6xl"
          >
            {restOfTitle}
          </motion.h2>
          {date ? (
            <motion.p style={{ opacity: hintOpacity }} className="text-lg text-white/85">
              {date}
            </motion.p>
          ) : null}
          {scrollToExpand ? (
            <motion.p
              style={{ opacity: hintOpacity }}
              className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-white/75"
            >
              {scrollToExpand}
            </motion.p>
          ) : null}
        </div>
      </div>

      {/* Revealed once the media has finished expanding. */}
      {children ? (
        <motion.div
          style={{ opacity: contentOpacity }}
          className="relative z-10 mx-auto max-w-4xl px-6 pb-24"
        >
          {children}
        </motion.div>
      ) : null}
    </section>
  );
}

function Media({
  mediaType,
  mediaSrc,
  posterSrc,
  title,
}: Pick<ScrollExpandMediaProps, 'mediaType' | 'mediaSrc' | 'posterSrc' | 'title'>) {
  if (mediaType === 'video') {
    return (
      <video
        src={mediaSrc}
        poster={posterSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        controls={false}
        disablePictureInPicture
        className="h-full w-full object-cover"
        aria-hidden="true"
      />
    );
  }
  return (
    <Image
      src={mediaSrc}
      alt={title ?? ''}
      fill
      sizes="(max-width: 768px) 95vw, 1670px"
      className="object-cover"
    />
  );
}

export default ScrollExpandMedia;
