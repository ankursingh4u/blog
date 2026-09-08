import { prisma } from '@/lib/db';
import { deleteKeyword, setKeywordStatus } from '@/lib/admin/actions';
import { KeywordForm } from '@/components/admin/keyword-form';
import { Badge, buttonClass } from '@/components/ui/primitives';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TABS = ['QUEUED', 'USED', 'SKIPPED'] as const;

type Search = Promise<{ status?: string }>;

export default async function AdminKeywordsPage({ searchParams }: { searchParams: Search }) {
  const { status } = await searchParams;
  const active = (TABS as readonly string[]).includes((status ?? '').toUpperCase())
    ? ((status ?? '').toUpperCase() as (typeof TABS)[number])
    : 'QUEUED';

  const [keywords, categories, counts] = await Promise.all([
    prisma.keyword.findMany({
      where: { status: active },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { position: 'asc' } }),
    prisma.keyword.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const countByStatus = new Map(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Keyword queue</h2>

        <div className="mt-4 flex gap-2">
          {TABS.map((tab) => (
            <a
              key={tab}
              href={`/admin/keywords?status=${tab}`}
              className={buttonClass(active === tab ? 'primary' : 'outline', 'sm')}
            >
              {tab} ({countByStatus.get(tab) ?? 0})
            </a>
          ))}
        </div>

        {keywords.length === 0 ? (
          <p className="surface mt-4 p-8 text-center text-sm text-muted-foreground">
            Nothing {active.toLowerCase()}. The daily run adds keywords from the Microsoft feeds.
          </p>
        ) : (
          <ul className="surface mt-4 divide-y divide-border">
            {keywords.map((keyword) => (
              <li key={keyword.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{keyword.phrase}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge>{keyword.source}</Badge>
                    {keyword.category ? <Badge tone="brand">{keyword.category.name}</Badge> : null}
                    {keyword.kbNumber ? <Badge tone="ok">{keyword.kbNumber}</Badge> : null}
                    {keyword.buildNumber ? <Badge tone="ok">{keyword.buildNumber}</Badge> : null}
                    {keyword.errorCode ? <Badge tone="ok">{keyword.errorCode}</Badge> : null}
                    <span>added {formatDate(keyword.createdAt)}</span>
                    {keyword.sourceUrl ? (
                      <a
                        href={keyword.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        source
                      </a>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {active !== 'QUEUED' ? (
                    <form action={setKeywordStatus}>
                      <input type="hidden" name="id" value={keyword.id} />
                      <input type="hidden" name="status" value="QUEUED" />
                      <button type="submit" className={buttonClass('outline', 'sm')}>
                        Requeue
                      </button>
                    </form>
                  ) : (
                    <form action={setKeywordStatus}>
                      <input type="hidden" name="id" value={keyword.id} />
                      <input type="hidden" name="status" value="SKIPPED" />
                      <button type="submit" className={buttonClass('outline', 'sm')}>
                        Skip
                      </button>
                    </form>
                  )}
                  <form action={deleteKeyword}>
                    <input type="hidden" name="id" value={keyword.id} />
                    <button
                      type="submit"
                      className={buttonClass('ghost', 'sm', 'text-danger hover:bg-danger/10')}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-semibold">Add a keyword manually</h2>
        <div className="mt-5">
          <KeywordForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </section>
    </div>
  );
}
