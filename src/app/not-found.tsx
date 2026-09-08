import Link from 'next/link';
import { Container, buttonClass } from '@/components/ui/primitives';
import { getCategories } from '@/lib/posts';

export default async function NotFound() {
  const categories = await getCategories();

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-brand">Error 404</p>
      <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        That page is not on this build
      </h1>
      <p className="mt-5 max-w-md text-muted-foreground">
        The URL does not match a guide, category or author here. Try a search, or pick a category
        below.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/search" className={buttonClass('primary', 'lg')}>
          Search the guides
        </Link>
        <Link href="/" className={buttonClass('outline', 'lg')}>
          Back to home
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <Link key={category.slug} href={`/${category.slug}`} className={buttonClass('ghost', 'sm')}>
            {category.name}
          </Link>
        ))}
      </div>
    </Container>
  );
}
