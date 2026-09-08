import Link from 'next/link';
import { Rss } from 'lucide-react';
import { Container } from '@/components/ui/primitives';
import { AdSlot } from '@/components/ad-slot';
import { getCategories } from '@/lib/posts';
import { getSettings } from '@/lib/settings';
import { SITE } from '@/lib/site';

export async function SiteFooter() {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  const year = new Date().getFullYear();

  return (
    <>
      <Container className="pb-8">
        <AdSlot placement="AD_SLOT_FOOTER" size="leaderboard" />
      </Container>

      <footer className="border-t border-border bg-muted/30">
        <Container className="py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm text-brand-foreground"
                >
                  F
                </span>
                {SITE.name}
              </Link>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                {settings.SITE_TAGLINE}
              </p>
              <p className="mt-4 max-w-sm text-xs text-muted-foreground">
                Independent and not affiliated with any company or organisation covered here.
                Articles are drafted with AI assistance and approved by a person before publishing —
                see the <Link href="/editorial-policy" className="underline hover:text-foreground">editorial policy</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold">Topics</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/${category.slug}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold">Site</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/about"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/editorial-policy"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Editorial policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/search"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Search
                  </Link>
                </li>
                <li>
                  <a
                    href="/feed.xml"
                    className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Rss className="h-3.5 w-3.5" aria-hidden="true" />
                    RSS
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
            © {year} {SITE.name}. Articles are provided as-is and are not professional advice;
            back up before applying any technical fix.
          </div>
        </Container>
      </footer>
    </>
  );
}
