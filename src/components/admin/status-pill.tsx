import type { PostStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const TONES: Record<PostStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  REVIEW: 'bg-warn/15 text-warn',
  APPROVED: 'bg-brand/15 text-brand',
  PUBLISHED: 'bg-ok/15 text-ok',
  ARCHIVED: 'bg-muted text-muted-foreground line-through',
};

export function StatusPill({ status }: { status: PostStatus }) {
  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide',
        TONES[status],
      )}
    >
      {status}
    </span>
  );
}
