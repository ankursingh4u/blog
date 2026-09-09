import type { Metadata } from 'next';
import { isAuthConfigured } from '@/lib/auth';
import { LoginForm } from '@/components/admin/login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
};

type Search = Promise<{ next?: string; reason?: string }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: Search }) {
  const { next, reason } = await searchParams;
  const configured = isAuthConfigured();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16">
      <div className="surface p-8">
        <h1 className="text-2xl font-bold tracking-tight">FixDesk admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area manages the site&rsquo;s content. It is not public.
        </p>

        {!configured ? (
          <div className="mt-6 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            <p className="font-medium">No password is configured.</p>
            <p className="mt-1.5">
              Set <code className="font-mono">ADMIN_PASSWORD</code> in <code className="font-mono">.env</code>{' '}
              and restart. Until then the admin is closed rather than open — there is no way in, by
              design.
            </p>
          </div>
        ) : (
          <>
            {reason === 'unconfigured' ? (
              <p className="mt-6 rounded-md border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
                Configuration changed. Sign in again.
              </p>
            ) : null}
            <LoginForm next={next} />
          </>
        )}
      </div>
    </div>
  );
}
