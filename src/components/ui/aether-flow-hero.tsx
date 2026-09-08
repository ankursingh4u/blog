'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useElementSize,
  useInView,
  usePrefersReducedMotion,
} from '@/hooks/use-motion';

/**
 * Connected-particle field behind the homepage hero.
 *
 * Adapted from the supplied `aether-flow-hero` reference. Changes made for
 * production use on a content site:
 *   - the canvas measures its own container, not `window`, so it can sit in a
 *     normal section instead of owning the viewport;
 *   - particle count is capped and scaled to area, and the neighbour-linking
 *     pass is O(n²) so the cap matters — 110 is the ceiling;
 *   - the loop stops when the section scrolls out of view or the tab is hidden;
 *   - honours `prefers-reduced-motion` by painting one static frame;
 *   - draws on a transparent canvas so the section background shows through
 *     and the hero works in both themes.
 */

const MAX_PARTICLES = 110;
const AREA_PER_PARTICLE = 14000;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface AetherFlowHeroProps {
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Extra content rendered under the actions (stats rail, ticker…). */
  footer?: ReactNode;
  className?: string;
}

export function AetherFlowHero({
  badge,
  title,
  description,
  actions,
  footer,
  className,
}: AetherFlowHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useElementSize(sectionRef);
  const inView = useInView(sectionRef, { rootMargin: '120px' });
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(MAX_PARTICLES, Math.floor((width * height) / AREA_PER_PARTICLE));
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.7,
    }));

    const pointer = { x: -1, y: -1, radius: 170 };
    const linkDistanceSq = Math.min(width, height) ** 2 / 40;

    // The reference palette assumes a black backdrop. On the light theme those
    // values wash out against white, so each theme gets its own — read once
    // per effect run and refreshed by the theme-change listener below.
    const palette = () =>
      document.documentElement.classList.contains('dark')
        ? {
            dot: 'rgba(191, 128, 255, 0.85)',
            link: (o: number) => `rgba(168, 128, 232, ${o * 0.42})`,
            hot: (o: number) => `rgba(236, 226, 255, ${o * 0.9})`,
          }
        : {
            dot: 'rgba(124, 58, 200, 0.55)',
            link: (o: number) => `rgba(124, 58, 200, ${o * 0.3})`,
            hot: (o: number) => `rgba(86, 26, 160, ${o * 0.55})`,
          };

    let colours = palette();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colours.dot;
        ctx.fill();
      }

      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distSq = dx * dx + dy * dy;
          if (distSq > linkDistanceSq) continue;

          const opacity = 1 - distSq / linkDistanceSq;
          const nearPointer =
            pointer.x >= 0 &&
            (particles[a].x - pointer.x) ** 2 + (particles[a].y - pointer.y) ** 2 <
              pointer.radius ** 2;

          ctx.strokeStyle = nearPointer ? colours.hot(opacity) : colours.link(opacity);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    };

    // Repaint when the theme toggle flips the `dark` class, otherwise a static
    // (reduced-motion) frame keeps the previous theme's palette forever.
    const themeObserver = new MutationObserver(() => {
      colours = palette();
      if (reducedMotion) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Reduced motion: one static frame, no loop, no animation listeners.
    if (reducedMotion) {
      draw();
      return () => themeObserver.disconnect();
    }

    let frame = 0;

    const step = () => {
      for (const p of particles) {
        if (p.x > width || p.x < 0) p.vx = -p.vx;
        if (p.y > height || p.y < 0) p.vy = -p.vy;

        if (pointer.x >= 0) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < pointer.radius + p.r) {
            const force = (pointer.radius - distance) / pointer.radius;
            p.x -= (dx / distance) * force * 4;
            p.y -= (dy / distance) * force * 4;
          }
        }

        p.x += p.vx;
        p.y += p.vy;
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    // Pointer coordinates are container-relative, so the repulsion lines up
    // with the cursor even when the hero is not at the top of the page.
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -1;
      pointer.y = -1;
    };

    const section = sectionRef.current;
    section?.addEventListener('pointermove', onPointerMove);
    section?.addEventListener('pointerleave', onPointerLeave);

    const visible = () => inView && !document.hidden;
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (visible()) frame = requestAnimationFrame(step);
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (visible()) frame = requestAnimationFrame(step);
    else draw();

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      section?.removeEventListener('pointermove', onPointerMove);
      section?.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [width, height, inView, reducedMotion]);

  const fadeUp = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 18 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: reducedMotion ? 0 : i * 0.09 + 0.12,
        duration: reducedMotion ? 0 : 0.65,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <div
      ref={sectionRef}
      className={cn(
        'relative isolate flex w-full flex-col items-center justify-center overflow-hidden',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        // Opacity is baked into the per-theme palette above, so the element
        // itself stays fully opaque in both themes.
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Keeps hero text at AA contrast over the particle field in both themes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background"
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-20 text-center sm:py-28">
        {badge ? (
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
            {badge}
          </motion.div>
        ) : null}

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 text-balance text-4xl font-bold tracking-tighter sm:text-6xl lg:text-7xl"
        >
          {title}
        </motion.h1>

        {description ? (
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg"
          >
            {description}
          </motion.p>
        ) : null}

        {actions ? (
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            {actions}
          </motion.div>
        ) : null}

        {footer ? (
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="mt-12">
            {footer}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default AetherFlowHero;
