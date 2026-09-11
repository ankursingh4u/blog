import type { Metadata } from 'next';
import Link from 'next/link';

import { Container, SectionHeading } from '@/components/ui/primitives';
import { SubmitForm } from '@/components/submit-form';
import { getCategories } from '@/lib/posts';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Write for us',
  description:
    'Send us an article. Editors read every submission, and anything we publish runs under your own name.',
  path: '/write',
});

/**
 * Rendered per request: it holds a form whose action writes to the database,
 * and the category list has to be current rather than whatever existed at the
 * last build.
 */
export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const categories = await getCategories();

  // Parents and their sub-sections, flattened, so a contributor can file
  // directly into /tech/windows rather than only the top level.
  const options = categories.flatMap((category) => [
    { id: category.id, name: category.name },
    ...category.children.map((child) => ({
      id: child.id,
      name: `${category.name} › ${child.name}`,
    })),
  ]);

  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        eyebrow="Contribute"
        title="Write for us"
        description="Send an article and we will read it. If we publish it, it runs under your name with your own author page."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <SubmitForm categories={options} />

        <aside className="surface space-y-5 p-6 text-sm">
          <div>
            <h2 className="font-semibold tracking-tight">What we look for</h2>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>Something you know about and can explain plainly.</li>
              <li>Claims a reader can check, with a link to where you got them.</li>
              <li>Your own words. We do not publish press releases.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold tracking-tight">What happens next</h2>
            <ol className="mt-3 space-y-2 text-muted-foreground">
              <li>An editor reads it. Nothing publishes automatically.</li>
              <li>We may edit for length, structure or clarity.</li>
              <li>If it runs, your name is the byline.</li>
            </ol>
          </div>

          <p className="border-t border-border pt-5 text-xs text-muted-foreground">
            Your email is used to reply to you and is never published. The standards we hold
            articles to are in the{' '}
            <Link href="/editorial-policy" className="underline hover:text-foreground">
              editorial policy
            </Link>
            .
          </p>
        </aside>
      </div>
    </Container>
  );
}
