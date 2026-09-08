import Link from 'next/link';
import Image from 'next/image';
import { CalendarCheck2, Clock, MonitorCheck, ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { formatDate, isoDate } from '@/lib/utils';

/**
 * The trust block under the H1: who wrote it, when it was verified, and on
 * which build. Google's helpful-content signals lean on this, and so do
 * readers deciding whether a fix is stale.
 */
export function ArticleMeta({
  author,
  publishedAt,
  updatedAt,
  lastVerifiedAt,
  testedOnBuild,
  readingMinutes,
}: {
  author: { name: string; slug: string; avatar: string | null };
  publishedAt: Date | null;
  updatedAt: Date;
  lastVerifiedAt: Date | null;
  testedOnBuild: string | null;
  readingMinutes: number;
}) {
  const published = formatDate(publishedAt);
  const updated = formatDate(updatedAt);
  const verified = formatDate(lastVerifiedAt);
  const showUpdated = updated && updated !== published;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-border py-4 text-sm">
      <Link href={`/author/${author.slug}`} className="group flex items-center gap-2.5">
        {author.avatar ? (
          <Image
            src={author.avatar}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-xs font-semibold text-brand"
          >
            {author.name.charAt(0)}
          </span>
        )}
        <span className="font-medium group-hover:text-brand">{author.name}</span>
      </Link>

      {published ? (
        <span className="text-muted-foreground">
          <time dateTime={isoDate(publishedAt)}>{published}</time>
        </span>
      ) : null}

      {showUpdated ? (
        <span className="text-muted-foreground">
          Updated <time dateTime={isoDate(updatedAt)}>{updated}</time>
        </span>
      ) : null}

      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {readingMinutes} min read
      </span>

      {testedOnBuild ? (
        <Badge tone="ok">
          <MonitorCheck className="h-3 w-3" aria-hidden="true" />
          Tested on {testedOnBuild}
        </Badge>
      ) : (
        <Badge tone="warn">
          <ShieldQuestion className="h-3 w-3" aria-hidden="true" />
          Verification pending
        </Badge>
      )}

      {verified ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
          Last verified <time dateTime={isoDate(lastVerifiedAt)}>{verified}</time>
        </span>
      ) : null}
    </div>
  );
}
