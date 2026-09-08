'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AdminNav({
  links,
}: {
  links: Array<{ href: string; label: string; exact?: boolean }>;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="mt-6 border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors',
                  active
                    ? 'border-brand font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
