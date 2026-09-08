'use client';

import { useActionState, useState } from 'react';
import { ImageIcon, Search } from 'lucide-react';
import { applyCoverImage, searchCoverImages, type ImageSearchState } from '@/lib/admin/actions';
import { EMPTY_STATE, FormMessage, SubmitButton } from '@/components/admin/form-controls';
import { buttonClass } from '@/components/ui/primitives';
import type { ImageCandidate } from '@/lib/images';

/**
 * Picks an openly-licensed photograph for the article cover.
 *
 * Searches Openverse, which needs no API key and costs nothing. Every result is
 * already filtered to a licence that permits commercial use — the site carries
 * advertising, so a non-commercial image is not an option however good it looks.
 *
 * Choosing one copies it into local storage and records its creator and licence
 * on the post, because CC-BY and CC-BY-SA require that credit to be displayed.
 * The two happen in one action: an image saved without its attribution is a
 * licensed photo turned into an infringing one.
 *
 * Applying reloads the editor, since the cover and its credit are written
 * server-side rather than held in form state.
 */
const INITIAL_SEARCH: ImageSearchState = { ok: false, message: '' };

export function CoverPicker({ postId, defaultQuery }: { postId: string; defaultQuery: string }) {
  const [searchState, searchAction] = useActionState(searchCoverImages, INITIAL_SEARCH);
  const [applyState, applyAction] = useActionState(applyCoverImage, EMPTY_STATE);
  const [open, setOpen] = useState(false);

  const results = searchState.results ?? [];

  return (
    <div className="mt-6 rounded-md border border-dashed border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Find a photo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Openly-licensed images cleared for commercial use. Free, and the credit is recorded
            automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={buttonClass('outline', 'sm')}
        >
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          {open ? 'Close' : 'Search images'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          {/* Its own form: the editor's save form wraps this, and a nested form
              is invalid HTML, so the search posts via formAction instead. */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <label htmlFor="cover-query" className="block text-xs text-muted-foreground">
                Search term
              </label>
              <input
                id="cover-query"
                name="query"
                defaultValue={defaultQuery}
                placeholder="e.g. cricket stadium"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <SubmitButton formAction={searchAction} variant="outline" size="md">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </SubmitButton>
          </div>

          {searchState.message ? (
            <p className={searchState.ok ? 'text-xs text-muted-foreground' : 'text-xs text-danger'}>
              {searchState.message}
            </p>
          ) : null}

          <FormMessage state={applyState} />

          {results.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((candidate: ImageCandidate) => (
                <li key={candidate.id} className="overflow-hidden rounded-md border border-border">
                  <div className="relative aspect-[4/3] bg-muted">
                    {/* Remote thumbnails from an image index; next/image would
                        need every host allow-listed, so a plain img is used. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={candidate.thumbnail}
                      alt={candidate.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-1.5 p-2">
                    <p className="line-clamp-2 text-xs leading-snug" title={candidate.title}>
                      {candidate.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {candidate.creator} · {candidate.license}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {candidate.width}×{candidate.height}
                    </p>
                    {/* The candidate rides on the button's own name/value, so
                        only the one clicked is submitted. A hidden input per
                        result would send all twelve. */}
                    <SubmitButton
                      formAction={applyAction}
                      name="candidateJson"
                      value={JSON.stringify(candidate)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Use this
                    </SubmitButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <input type="hidden" name="id" value={postId} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders the licence credit for a stored cover, in the editor and on the
 * article page.
 */
export function ImageCreditLine({
  credit,
  className,
}: {
  credit: {
    creator: string;
    creatorUrl: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
    sourceName: string;
    title: string;
  };
  className?: string;
}) {
  if (!credit.creator && !credit.license) return null;

  return (
    <p className={className}>
      {credit.title ? <span>{credit.title} · </span> : null}
      {credit.creatorUrl ? (
        <a href={credit.creatorUrl} rel="noopener noreferrer nofollow" target="_blank" className="underline">
          {credit.creator}
        </a>
      ) : (
        <span>{credit.creator}</span>
      )}
      {credit.license ? (
        <>
          {' · '}
          {credit.licenseUrl ? (
            <a
              href={credit.licenseUrl}
              rel="license noopener noreferrer"
              target="_blank"
              className="underline"
            >
              {credit.license}
            </a>
          ) : (
            <span>{credit.license}</span>
          )}
        </>
      ) : null}
      {credit.sourceUrl ? (
        <>
          {' · '}
          <a
            href={credit.sourceUrl}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="underline"
          >
            {credit.sourceName || 'source'}
          </a>
        </>
      ) : null}
    </p>
  );
}
