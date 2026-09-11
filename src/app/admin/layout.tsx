import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';
import { hasApiKey } from '@/lib/ai';
import { signOut } from '@/lib/admin/auth-actions';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Admin',
  // Belt and braces alongside the robots.txt disallow: /admin is
  // password-protected but must never be indexed regardless.
  robots: { index: false, follow: false, nocache: true },
};

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/submissions', label: 'Submissions' },
  { href: '/admin/keywords', label: 'Keywords' },
  { href: '/admin/authors', label: 'Authors' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/20">
      <div className="border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-xs text-muted-foreground sm:px-6">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
          <span>Signed in. Sessions last 12 hours.</span>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="underline hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{SITE.name} admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasApiKey()
                ? 'Generation is configured.'
                : 'OPENAI_API_KEY is not set — generation is disabled.'}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View site
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </header>

        <AdminNav links={LINKS} />

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
