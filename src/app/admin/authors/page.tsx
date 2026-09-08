import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StringArray, parseJson } from '@/lib/json';
import { deleteAuthor } from '@/lib/admin/actions';
import { AuthorForm } from '@/components/admin/author-form';
import { Badge, buttonClass } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

export default async function AdminAuthorsPage() {
  const [authors, categories, counts] = await Promise.all([
    prisma.author.findMany({ orderBy: { name: 'asc' } }),
    prisma.category.findMany({ orderBy: { position: 'asc' } }),
    prisma.post.groupBy({ by: ['authorId'], _count: { _all: true } }),
  ]);

  const postCount = new Map(counts.map((c) => [c.authorId, c._count._all]));
  const categoryOptions = categories.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Authors ({authors.length})</h2>

        <div className="mt-4 space-y-6">
          {authors.map((author) => {
            const focus = parseJson(author.categoryFocus, StringArray, []);
            const used = postCount.get(author.id) ?? 0;
            return (
              <details key={author.id} className="surface p-5">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{author.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">/{author.slug}</span>
                    <Badge>{used} post{used === 1 ? '' : 's'}</Badge>
                    {focus.map((slug) => (
                      <Badge key={slug} tone="brand">
                        {categories.find((c) => c.slug === slug)?.name ?? slug}
                      </Badge>
                    ))}
                  </span>
                  <Link
                    href={`/author/${author.slug}`}
                    target="_blank"
                    className={buttonClass('ghost', 'sm')}
                  >
                    View page
                  </Link>
                </summary>

                <div className="mt-6 border-t border-border pt-6">
                  <AuthorForm
                    categories={categoryOptions}
                    author={{
                      id: author.id,
                      name: author.name,
                      slug: author.slug,
                      bio: author.bio,
                      avatar: author.avatar ?? '',
                      stylePrompt: author.stylePrompt,
                      categoryFocus: focus,
                    }}
                  />

                  <form action={deleteAuthor} className="mt-6 border-t border-border pt-4">
                    <input type="hidden" name="id" value={author.id} />
                    <button
                      type="submit"
                      disabled={used > 0}
                      className={buttonClass('ghost', 'sm', 'text-danger hover:bg-danger/10')}
                    >
                      Delete author
                    </button>
                    {used > 0 ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Reassign their {used} post{used === 1 ? '' : 's'} first.
                      </span>
                    ) : null}
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-semibold">Add an author</h2>
        <div className="mt-5">
          <AuthorForm categories={categoryOptions} />
        </div>
      </section>
    </div>
  );
}
