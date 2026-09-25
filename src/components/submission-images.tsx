'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Trash2, X } from 'lucide-react';

import { inputClass } from '@/components/admin/form-controls';
import { buttonClass } from '@/components/ui/primitives';
import { MAX_CAPTION_CHARS, MAX_IMAGES, MAX_IMAGE_BYTES } from '@/lib/submission-limits';

/**
 * The picture half of the /write form.
 *
 * It replaced a fixed grid of four file inputs paired with four caption boxes.
 * That shape had a defect that was invisible until you skipped a row: the
 * server pairs `images` with `imageTitles` by position, but an untouched file
 * input still submits a zero-byte File, which the store drops. Fill rows two
 * and four and the captions slide onto the wrong pictures — row two's caption
 * lands on row four's image and row four's caption is lost. Nothing in the UI
 * showed it, because nothing in the UI showed the pictures at all.
 *
 * Holding the chosen files in state instead removes the failure rather than
 * patching it: there is no such thing as an empty slot, so there is no gap for
 * a caption to fall through. The list the contributor arranges is the list that
 * is sent, and they can see it.
 *
 * Both halves still reach the action as ordinary form fields — a `files` list
 * on one hidden input and a hidden text input per caption, emitted in card
 * order — so `submitArticle` keeps taking a plain FormData and knows nothing
 * about any of this.
 */

const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif';
const ACCEPTED_TYPES = new Set(ACCEPT.split(','));
const MAX_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024);

interface Item {
  /** Stable across reorders, so React keeps each card's DOM node and preview. */
  id: string;
  file: File;
  caption: string;
  previewUrl: string;
  /** Set when the file itself is unusable — too big, or not an image we take. */
  problem: string | null;
}

let counter = 0;
const nextId = () => `img-${(counter += 1)}`;

function describe(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return `${file.type || 'That file type'} is not an image we can publish. Use PNG, JPEG, WebP, AVIF or GIF.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${(file.size / 1024 / 1024).toFixed(1)}MB is over the ${MAX_MB}MB limit.`;
  }
  return null;
}

export function SubmissionImages() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pickerRef = useRef<HTMLInputElement>(null);
  const carrierRef = useRef<HTMLInputElement>(null);

  /**
   * Mirrors the ordered state onto the real file input the form submits.
   *
   * A file input's value cannot be assigned, but its `files` can be handed a
   * FileList built from a DataTransfer — which is the only way to submit files
   * in an order the contributor chose rather than the order they picked them.
   */
  useEffect(() => {
    const input = carrierRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const item of items) {
      if (!item.problem) transfer.items.add(item.file);
    }
    input.files = transfer.files;
  }, [items]);

  // Object URLs are a manual allocation; released when the component goes away.
  useEffect(() => {
    return () => {
      for (const item of items) URL.revokeObjectURL(item.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setItems((current) => {
      const room = MAX_IMAGES - current.length;
      if (room <= 0) {
        setNotice(`That is the limit — ${MAX_IMAGES} pictures. Remove one to add another.`);
        return current;
      }
      const incoming = Array.from(files).slice(0, room);
      setNotice(
        files.length > room
          ? `Only the first ${room} were added; ${MAX_IMAGES} pictures is the limit.`
          : null,
      );
      return [
        ...current,
        ...incoming.map((file) => ({
          id: nextId(),
          file,
          caption: '',
          previewUrl: URL.createObjectURL(file),
          problem: describe(file),
        })),
      ];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => {
      const going = current.find((i) => i.id === id);
      if (going) URL.revokeObjectURL(going.previewUrl);
      return current.filter((i) => i.id !== id);
    });
    setNotice(null);
  }, []);

  const caption = useCallback((id: string, value: string) => {
    setItems((current) => current.map((i) => (i.id === id ? { ...i, caption: value } : i)));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setItems((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">Pictures for the article</legend>
      <p className="text-xs text-muted-foreground">
        Optional, up to {MAX_IMAGES}, {MAX_MB}MB each. Give each one a description — it is published
        as the caption underneath, and read out to anyone using a screen reader. Drag the cards to
        set the order they appear in the article. Only send pictures you have the right to publish.
      </p>

      {/*
        The picker is a separate input from the one that submits. This one only
        ever reports a choice; the hidden carrier below holds the ordered list.
        `value=""` on every change lets the same file be picked twice running,
        which otherwise fires no change event at all.
      */}
      <input
        ref={pickerRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          add(event.target.files);
          event.target.value = '';
        }}
      />
      <input ref={carrierRef} type="file" name="images" multiple className="sr-only" tabIndex={-1} aria-hidden="true" />

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-input px-6 py-10 text-center transition-colors hover:border-brand hover:bg-brand/5"
        >
          <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">Add pictures</span>
          <span className="text-xs text-muted-foreground">
            PNG, JPEG, WebP, AVIF or GIF — up to {MAX_IMAGES}
          </span>
        </button>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <ImageCard
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              isDragging={dragIndex === index}
              isOver={overIndex === index && dragIndex !== index}
              onCaption={caption}
              onRemove={remove}
              onMove={move}
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => setOverIndex(index)}
              onDrop={() => {
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            />
          ))}
        </ul>
      )}

      {items.length > 0 && items.length < MAX_IMAGES ? (
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          className={buttonClass('outline', 'sm')}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Add another picture
        </button>
      ) : null}

      {notice ? (
        <p role="status" className="flex items-start gap-2 text-xs text-muted-foreground">
          {notice}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </p>
      ) : null}

      {/*
        Live region rather than a visual cue alone: a card moved with the arrow
        buttons changes position silently otherwise.
      */}
      <p aria-live="polite" className="sr-only">
        {items.length === 0
          ? 'No pictures added.'
          : `${items.length} picture${items.length === 1 ? '' : 's'}, in order: ${items
              .map((i, n) => `${n + 1}. ${i.caption.trim() || i.file.name}`)
              .join(', ')}.`}
      </p>
    </fieldset>
  );
}

function ImageCard({
  item,
  index,
  total,
  isDragging,
  isOver,
  onCaption,
  onRemove,
  onMove,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  item: Item;
  index: number;
  total: number;
  isDragging: boolean;
  isOver: boolean;
  onCaption: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const captionId = useId();

  return (
    <li
      draggable
      onDragStart={(event) => {
        // Firefox starts no drag at all unless something is on the transfer.
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      className={[
        'surface flex gap-4 p-3 transition-shadow',
        isDragging ? 'opacity-50' : '',
        isOver ? 'ring-2 ring-brand' : '',
        item.problem ? 'border-danger/40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="flex cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing"
        aria-hidden="true"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/*
        A plain <img>, not next/image: the source is a blob: URL for a file that
        exists only in this browser, so there is nothing for the optimiser to
        fetch or cache.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.previewUrl}
        alt=""
        className="h-20 w-20 shrink-0 rounded-md border border-border object-cover"
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{index + 1}.</span> {item.file.name}{' '}
            <span className="whitespace-nowrap">({(item.file.size / 1024).toFixed(0)}KB)</span>
          </p>

          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              label={`Move ${item.file.name} up`}
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={`Move ${item.file.name} down`}
              disabled={index === total - 1}
              onClick={() => onMove(index, index + 1)}
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton label={`Remove ${item.file.name}`} onClick={() => onRemove(item.id)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        {item.problem ? (
          <p className="text-xs text-danger">{item.problem} It will not be sent.</p>
        ) : null}

        <label htmlFor={captionId} className="sr-only">
          Description for {item.file.name}
        </label>
        <textarea
          id={captionId}
          rows={2}
          maxLength={MAX_CAPTION_CHARS}
          value={item.caption}
          onChange={(event) => onCaption(item.id, event.target.value)}
          placeholder="What does this picture show?"
          className={`${inputClass} text-sm`}
        />

        {/*
          The caption travels as its own field, emitted in card order so the
          action's positional pairing lines up. Skipped for a file that will not
          be sent, or the lists would fall out of step again.
        */}
        {item.problem ? null : <input type="hidden" name="imageTitles" value={item.caption} />}
      </div>
    </li>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * The cover picture, kept separate because it does a different job — it is what
 * appears on cards, in the feed and in a social preview — but it gets the same
 * courtesy of showing you what you picked.
 */
export function HeroImageField() {
  const [preview, setPreview] = useState<{ url: string; name: string; problem: string | null } | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  return (
    <div className="space-y-3">
      <input
        id="heroImage"
        name="heroImage"
        type="file"
        accept={ACCEPT}
        className="block w-full text-sm text-muted-foreground file:mr-4 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview((old) => {
            if (old) URL.revokeObjectURL(old.url);
            return file
              ? { url: URL.createObjectURL(file), name: file.name, problem: describe(file) }
              : null;
          });
        }}
      />

      {preview ? (
        <div className="surface flex items-center gap-4 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt=""
            className="h-20 w-32 shrink-0 rounded-md border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{preview.name}</p>
            {preview.problem ? (
              <p className="mt-1 text-xs text-danger">{preview.problem}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                This is what readers see on cards and when the article is shared.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
