import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------- Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-foreground hover:bg-brand/90',
  secondary: 'bg-muted text-foreground hover:bg-muted/70',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  outline: 'border border-border bg-transparent hover:bg-muted',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
}) {
  const external = href.startsWith('http');
  if (external) {
    return (
      <a
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        className={buttonClass(variant, size, className)}
        {...props}
      />
    );
  }
  return <Link href={href} className={buttonClass(variant, size, className)} {...props} />;
}

/* --------------------------------------------------------------------- Badge */

const badgeTones = {
  neutral: 'border-border bg-muted text-muted-foreground',
  brand: 'border-brand/30 bg-brand/10 text-brand',
  ok: 'border-ok/30 bg-ok/10 text-ok',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  danger: 'border-danger/30 bg-danger/10 text-danger',
} as const;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Structure */

export function Container({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'main' | 'header' | 'footer';
}) {
  return <Tag className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</Tag>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------------- Callout */

export function Callout({
  title,
  tone = 'brand',
  icon,
  children,
  className,
}: {
  title?: string;
  tone?: 'brand' | 'ok' | 'warn' | 'danger';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: 'border-brand/30 bg-brand/5',
    ok: 'border-ok/30 bg-ok/5',
    warn: 'border-warn/30 bg-warn/5',
    danger: 'border-danger/30 bg-danger/5',
  } as const;

  return (
    <aside className={cn('rounded-lg border p-5', tones[tone], className)}>
      {title ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </p>
      ) : null}
      <div className={cn('text-sm leading-relaxed text-foreground/85', title && 'mt-2')}>
        {children}
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------- JSON-LD */

/** One `<script type="application/ld+json">` per page, emitted server-side. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Server-rendered from our own builders in src/lib/seo.ts. The replace
      // stops a "</script>" inside any string field from closing the tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
