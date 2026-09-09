import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import './globals.css';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { JsonLd } from '@/components/ui/primitives';
import { getCategories } from '@/lib/posts';
import { getSettings } from '@/lib/settings';
import { SITE, absoluteUrl } from '@/lib/site';
import { jsonLdGraph, organisationLd, websiteLd } from '@/lib/seo';

/**
 * The fonts are checked into the repo and loaded from disk rather than through
 * `next/font/google`.
 *
 * `next/font/google` downloads the files during `next build`, which makes the
 * build depend on fonts.googleapis.com being reachable. The deployment host
 * cannot reach it — npm works, Google Fonts does not — so the build failed
 * there while succeeding locally. Self-hosting removes the dependency
 * altogether: the build needs no network, and no visitor's browser is sent to a
 * third party to render the page.
 *
 * These are the latin-subset variable files, 88 KB for both. `display: swap`
 * and the `fallback` list keep text visible during load, so replacing a font
 * costs no layout shift.
 */
const inter = localFont({
  src: './fonts/Inter-variable.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const mono = localFont({
  src: './fonts/JetBrainsMono-variable.woff2',
  variable: '--font-mono',
  display: 'swap',
  weight: '100 800',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    // Left over from when the site was Windows-only. The homepage title is the
    // one Google shows for the domain, so it has to describe all eight
    // verticals, not the back-catalogue.
    default: `${SITE.name} — trending stories, explained properly`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': absoluteUrl('/feed.xml') },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Light is the site default, so the plain themeColor matches it. The dark
  // entry only applies once a reader has opted in.
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

/**
 * Applies the stored theme before first paint. Inlined and run synchronously
 * in <head> — anything async here produces a visible flash of the wrong theme.
 *
 * Light is the default. Long troubleshooting guides are read in daylight far
 * more often than not, and the system preference is deliberately *not*
 * consulted: a reader who has never touched the toggle should always land on
 * the same surface the screenshots and article images were designed against.
 * Dark is one click away and remembered from then on.
 */
const themeScript = `
(function () {
  try {
    document.documentElement.classList.toggle(
      'dark',
      localStorage.getItem('theme') === 'dark'
    );
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);

  const nav = categories.map((c) => ({ href: `/${c.slug}`, label: c.name }));

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {settings.GSC_VERIFICATION ? (
          <meta name="google-site-verification" content={settings.GSC_VERIFICATION} />
        ) : null}
        <link rel="alternate" type="application/rss+xml" title={SITE.name} href="/feed.xml" />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <JsonLd data={jsonLdGraph(organisationLd(), websiteLd())} />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
        >
          Skip to content
        </a>

        <SiteHeader categories={nav} siteName={SITE.name} />
        <main id="main">{children}</main>
        <SiteFooter />

        {settings.GA4_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.GA4_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
