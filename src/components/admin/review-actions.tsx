'use client';

import { useState } from 'react';
import { approvePost, rejectPost } from '@/lib/admin/actions';
import { buttonClass } from '@/components/ui/primitives';

/**
 * Approve / reject, inline in the review queue.
 *
 * Client-side only for the reject reason, which needs a second step: rejecting
 * without saying why throws away the one useful by-product of a bad draft. The
 * approve path is a plain form post with no confirmation, publishing is
 * reversible from the editor in one click, so a dialog would cost more than the
 * mistake does.
 *
 * Rejection is not deletion. The draft is archived with the reason attached, so
 * a pattern of "invented a figure" or "restated the headline" is visible later
 * rather than lost.
 */
export function ReviewActions({ id, title }: { id: string; title: string }) {
  const [rejecting, setRejecting] = useState(false);

  if (rejecting) {
    return (
      <form
        action={rejectPost}
        className="flex flex-wrap items-center gap-2"
        // Labelled for screen readers, since the visible context is the row above.
        aria-label={`Reject ${title}`}
      >
        <input type="hidden" name="id" value={id} />
        <input
          name="reason"
          autoFocus
          required
          maxLength={500}
          placeholder="Why? e.g. invented a figure"
          className="h-8 w-56 rounded-md border border-border bg-background px-2 text-sm"
        />
        <button type="submit" className={buttonClass('outline', 'sm')}>
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setRejecting(false)}
          className={buttonClass('ghost', 'sm')}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <form action={approvePost}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={buttonClass('primary', 'sm')}>
          Approve
        </button>
      </form>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        className={buttonClass('ghost', 'sm')}
      >
        Reject
      </button>
    </div>
  );
}
