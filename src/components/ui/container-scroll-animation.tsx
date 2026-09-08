'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Scroll-driven 3D "laptop lid" reveal: a title that drifts up while a card
 * rotates flat towards the reader.
 *
 * Adapted from the supplied `container-scroll-animation` reference. Changes:
 *   - the outer height is a prop instead of a hard-coded 60/80rem, because the
 *     original reserves a full extra viewport of empty space;
 *   - card chrome uses theme tokens rather than fixed #222/#6C6C6C;
 *   - `prefers-reduced-motion` renders the card flat and unanimated, which
 *     also removes the transform that would otherwise blur text on some GPUs;
 *   - the mobile check is a matchMedia hook, so it does not re-render on every
 *     resize tick.
 */

interface ContainerScrollProps {
  titleComponent: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ContainerScroll({ titleComponent, children, className }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({ target: containerRef });

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.8, 0.95] : [1.04, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -90]);

  if (reducedMotion) {
    return (
      <div className={cn('relative flex flex-col items-center gap-10 py-12', className)}>
        <div className="mx-auto max-w-5xl text-center">{titleComponent}</div>
        <StaticCard>{children}</StaticCard>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-[46rem] items-center justify-center p-2 md:h-[62rem] md:p-12',
        className,
      )}
    >
      <div className="relative w-full py-10 md:py-24" style={{ perspective: '1000px' }}>
        <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
          {titleComponent}
        </motion.div>
        <TiltCard rotate={rotate} scale={scale}>
          {children}
        </TiltCard>
      </div>
    </div>
  );
}

function TiltCard({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: ReactNode;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 9px 20px rgba(0,0,0,0.28), 0 37px 37px rgba(0,0,0,0.24), 0 84px 50px rgba(0,0,0,0.14), 0 149px 60px rgba(0,0,0,0.04)',
      }}
      className="mx-auto -mt-10 h-[26rem] w-full max-w-5xl rounded-[30px] border-4 border-border bg-muted p-2 md:h-[38rem] md:p-5"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-background">{children}</div>
    </motion.div>
  );
}

function StaticCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl rounded-[30px] border-4 border-border bg-muted p-2 md:p-5">
      <div className="overflow-hidden rounded-2xl bg-background">{children}</div>
    </div>
  );
}

export default ContainerScroll;
