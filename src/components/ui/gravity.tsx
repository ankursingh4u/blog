'use client';

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Matter, {
  Bodies,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Query,
  Render,
  Runner,
  World,
} from 'matter-js';
import { cn, debounce } from '@/lib/utils';
import { useInView, usePrefersReducedMotion } from '@/hooks/use-motion';

/**
 * Matter.js physics container: children are registered as rigid bodies, fall
 * under gravity, and can be thrown around with the pointer.
 *
 * Adapted from the supplied `gravity` reference. Changes:
 *   - `bodyType: 'svg'` and its `svg-path-commander` dependency are removed.
 *     Path-sampled bodies were unused, and the library plus `poly-decomp` cost
 *     roughly 150 KB of client JavaScript for a decorative effect on a site
 *     with a Core Web Vitals budget. Rectangle and circle bodies remain, which
 *     is what the pill layout actually needs.
 *   - `lodash.debounce` is replaced by the four-line local `debounce` in
 *     `@/lib/utils`, dropping another dependency.
 *   - `require("poly-decomp")` is gone. It was a CommonJS `require` inside a
 *     client component, which does not resolve under the App Router bundler,
 *     and it was only needed for the concave SVG bodies that no longer exist.
 *   - The simulation only runs while the container is on screen and the tab is
 *     visible; scrolling past it stops the runner instead of burning frames.
 *   - Under `prefers-reduced-motion` no engine is created at all: children are
 *     laid out statically at their declared positions.
 *   - The unique body id comes from `useId()` rather than `Math.random()`, so
 *     it is stable across the hydration boundary.
 */

function calculatePosition(
  value: number | string | undefined,
  containerSize: number,
  elementSize: number,
) {
  if (typeof value === 'string' && value.endsWith('%')) {
    return (containerSize * Number.parseFloat(value)) / 100;
  }
  return typeof value === 'number' ? value : elementSize - containerSize + elementSize / 2;
}

export interface MatterBodyProps {
  children: ReactNode;
  matterBodyOptions?: Matter.IBodyDefinition;
  isDraggable?: boolean;
  bodyType?: 'rectangle' | 'circle';
  x?: number | string;
  y?: number | string;
  angle?: number;
  className?: string;
}

interface PhysicsBody {
  element: HTMLElement;
  body: Matter.Body;
  props: MatterBodyProps;
}

export interface GravityRef {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

interface GravityContextValue {
  registerElement: (id: string, element: HTMLElement, props: MatterBodyProps) => void;
  unregisterElement: (id: string) => void;
  /** Null when reduced motion is on — children then position themselves in CSS. */
  enabled: boolean;
}

const GravityContext = createContext<GravityContextValue | null>(null);

export function MatterBody({
  children,
  className,
  matterBodyOptions = { friction: 0.1, restitution: 0.1, density: 0.001, isStatic: false },
  bodyType = 'rectangle',
  isDraggable = true,
  x = 0,
  y = 0,
  angle = 0,
}: MatterBodyProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const context = useContext(GravityContext);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !context?.enabled) return;
    context.registerElement(id, element, {
      children,
      matterBodyOptions,
      bodyType,
      isDraggable,
      x,
      y,
      angle,
    });
    return () => context.unregisterElement(id);
    // The physics body is defined by geometry, not by the React children.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, context?.enabled, bodyType, isDraggable, x, y, angle]);

  // Reduced motion: no engine exists, so lay the pill out where it was declared.
  const staticStyle =
    context?.enabled === false
      ? {
          left: typeof x === 'string' ? x : `${x}px`,
          top: typeof y === 'string' ? y : `${y}px`,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        }
      : undefined;

  return (
    <div
      ref={elementRef}
      style={staticStyle}
      className={cn('absolute', className, isDraggable && context?.enabled && 'pointer-events-none')}
    >
      {children}
    </div>
  );
}

interface GravityProps {
  children: ReactNode;
  debug?: boolean;
  gravity?: { x: number; y: number };
  resetOnResize?: boolean;
  grabCursor?: boolean;
  addTopWall?: boolean;
  autoStart?: boolean;
  /**
   * Whether bodies can be grabbed and thrown. Turning this off skips the
   * MouseConstraint and makes the physics canvas click-through, which is what
   * you want when the bodies are real links — otherwise the canvas sits on top
   * and eats every click.
   */
  draggable?: boolean;
  className?: string;
}

export const Gravity = forwardRef<GravityRef, GravityProps>(function Gravity(
  {
    children,
    debug = false,
    gravity = { x: 0, y: 1 },
    grabCursor = true,
    resetOnResize = true,
    addTopWall = true,
    autoStart = true,
    draggable = true,
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesMap = useRef(new Map<string, PhysicsBody>());
  const frameId = useRef<number | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const mouseDown = useRef(false);
  const isRunning = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(containerRef, { rootMargin: '120px' });
  const enabled = !reducedMotion;

  if (enabled && !engineRef.current) engineRef.current = Engine.create();

  const registerElement = useCallback(
    (id: string, element: HTMLElement, props: MatterBodyProps) => {
      const container = containerRef.current;
      const engine = engineRef.current;
      if (!container || !engine) return;

      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const rect = container.getBoundingClientRect();
      const angle = (props.angle || 0) * (Math.PI / 180);
      const x = calculatePosition(props.x, rect.width, width);
      const y = calculatePosition(props.y, rect.height, height);

      const render = {
        fillStyle: debug ? '#888888' : 'transparent',
        strokeStyle: debug ? '#333333' : 'transparent',
        lineWidth: debug ? 3 : 0,
      };

      const body =
        props.bodyType === 'circle'
          ? Bodies.circle(x, y, Math.max(width, height) / 2, {
              ...props.matterBodyOptions,
              angle,
              render,
            })
          : Bodies.rectangle(x, y, width, height, {
              ...props.matterBodyOptions,
              angle,
              render,
            });

      World.add(engine.world, [body]);
      bodiesMap.current.set(id, { element, body, props });
    },
    [debug],
  );

  const unregisterElement = useCallback((id: string) => {
    const entry = bodiesMap.current.get(id);
    const engine = engineRef.current;
    if (entry && engine) {
      World.remove(engine.world, entry.body);
      bodiesMap.current.delete(id);
    }
  }, []);

  const updateElements = useCallback(() => {
    bodiesMap.current.forEach(({ element, body }) => {
      const { x, y } = body.position;
      const rotation = body.angle * (180 / Math.PI);
      element.style.transform = `translate(${x - element.offsetWidth / 2}px, ${
        y - element.offsetHeight / 2
      }px) rotate(${rotation}deg)`;
    });
    frameId.current = requestAnimationFrame(updateElements);
  }, []);

  const startEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || isRunning.current) return;
    if (runnerRef.current) Runner.run(runnerRef.current, engine);
    if (renderRef.current) Render.run(renderRef.current);
    frameId.current = requestAnimationFrame(updateElements);
    isRunning.current = true;
  }, [updateElements]);

  const stopEngine = useCallback(() => {
    if (!isRunning.current) return;
    if (runnerRef.current) Runner.stop(runnerRef.current);
    if (renderRef.current) Render.stop(renderRef.current);
    if (frameId.current) cancelAnimationFrame(frameId.current);
    isRunning.current = false;
  }, []);

  const clearRenderer = useCallback(() => {
    if (frameId.current) cancelAnimationFrame(frameId.current);
    const engine = engineRef.current;

    if (mouseConstraintRef.current && engine) {
      World.remove(engine.world, mouseConstraintRef.current);
      mouseConstraintRef.current = null;
    }
    if (renderRef.current) {
      Mouse.clearSourceEvents(renderRef.current.mouse);
      Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
      renderRef.current = null;
    }
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }
    if (engine) {
      World.clear(engine.world, false);
      Engine.clear(engine);
    }
    bodiesMap.current.clear();
    isRunning.current = false;
  }, []);

  const initializeRenderer = useCallback(() => {
    const container = containerRef.current;
    const engine = engineRef.current;
    if (!container || !engine) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    if (width === 0 || height === 0) return;
    setCanvasSize({ width, height });

    engine.gravity.x = gravity.x;
    engine.gravity.y = gravity.y;

    renderRef.current = Render.create({
      element: container,
      engine,
      options: { width, height, wireframes: false, background: 'transparent' },
    });

    if (!draggable) {
      // Nothing is grabbable, so let clicks and scrolls pass straight through
      // to whatever the bodies are wrapping.
      renderRef.current.canvas.style.pointerEvents = 'none';
    }

    if (draggable) {
      const mouse = Mouse.create(renderRef.current.canvas);
      // Let the page keep scrolling when the pointer passes over the canvas.
      // Matter binds wheel/touchmove handlers that would otherwise swallow it.
      const mouseElement = mouse as unknown as {
        element: HTMLElement;
        mousewheel: EventListener;
        touchmove: EventListener;
      };
      mouseElement.element.removeEventListener('wheel', mouseElement.mousewheel);
      mouseElement.element.removeEventListener('touchmove', mouseElement.touchmove);

      mouseConstraintRef.current = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, render: { visible: debug } },
      });
      World.add(engine.world, [mouseConstraintRef.current]);
      renderRef.current.mouse = mouse;
    }

    const wallOptions = { isStatic: true, friction: 1, render: { visible: debug } };
    const walls = [
      Bodies.rectangle(width / 2, height + 10, width, 20, wallOptions),
      Bodies.rectangle(width + 10, height / 2, 20, height, wallOptions),
      Bodies.rectangle(-10, height / 2, 20, height, wallOptions),
    ];
    if (addTopWall) walls.push(Bodies.rectangle(width / 2, -10, width, 20, wallOptions));

    const touchingMouse = () =>
      Query.point(engine.world.bodies, mouseConstraintRef.current?.mouse.position ?? { x: 0, y: 0 })
        .length > 0;

    if (grabCursor && draggable) {
      Events.on(engine, 'beforeUpdate', () => {
        if (!container) return;
        if (touchingMouse()) container.style.cursor = mouseDown.current ? 'grabbing' : 'grab';
        else if (!mouseDown.current) container.style.cursor = 'default';
      });
      container.addEventListener('mousedown', () => {
        mouseDown.current = true;
        container.style.cursor = touchingMouse() ? 'grabbing' : 'default';
      });
      container.addEventListener('mouseup', () => {
        mouseDown.current = false;
        container.style.cursor = touchingMouse() ? 'grab' : 'default';
      });
    }

    World.add(engine.world, walls);
    runnerRef.current = Runner.create();

    if (autoStart) startEngine();
    else Render.run(renderRef.current);
  }, [gravity.x, gravity.y, debug, addTopWall, grabCursor, autoStart, draggable, startEngine]);

  const reset = useCallback(() => {
    stopEngine();
    bodiesMap.current.forEach(({ element, body, props }) => {
      Matter.Body.setAngle(body, ((props.angle || 0) * Math.PI) / 180);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setPosition(body, {
        x: calculatePosition(props.x, canvasSize.width, element.offsetWidth),
        y: calculatePosition(props.y, canvasSize.height, element.offsetHeight),
      });
    });
    startEngine();
  }, [stopEngine, startEngine, canvasSize.width, canvasSize.height]);

  useImperativeHandle(ref, () => ({ start: startEngine, stop: stopEngine, reset }), [
    startEngine,
    stopEngine,
    reset,
  ]);

  useEffect(() => {
    if (!enabled) return;
    initializeRenderer();
    return clearRenderer;
  }, [enabled, initializeRenderer, clearRenderer]);

  useEffect(() => {
    if (!enabled || !resetOnResize) return;
    const onResize = debounce(() => {
      clearRenderer();
      initializeRenderer();
    }, 400);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      onResize.cancel();
    };
  }, [enabled, resetOnResize, clearRenderer, initializeRenderer]);

  // Physics is decoration; it should cost nothing when nobody is looking at it.
  useEffect(() => {
    if (!enabled) return;
    const sync = () => {
      if (inView && !document.hidden) startEngine();
      else stopEngine();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [enabled, inView, startEngine, stopEngine]);

  return (
    <GravityContext.Provider value={{ registerElement, unregisterElement, enabled }}>
      <div ref={containerRef} className={cn('absolute inset-0 h-full w-full', className)}>
        {children}
      </div>
    </GravityContext.Provider>
  );
});

export default Gravity;
