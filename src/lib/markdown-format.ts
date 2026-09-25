/**
 * The text transformations behind the write-box toolbar.
 *
 * Pure string-in, string-out functions with no imports, so the editor stays a
 * thin shell around them and they can be tested without a DOM. Each returns the
 * new value plus where the selection should land, because a formatting control
 * that loses the caret is worse than no control at all.
 */

export interface Edit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Block markers are mutually exclusive — applying one replaces another. */
const BLOCK_PREFIX = /^(#{1,6} {1,}| {0,3}> ?|[-*+] {1,}|\d+\. {1,})/;

function stripBlockPrefix(line: string) {
  return line.replace(BLOCK_PREFIX, '');
}

/**
 * Wraps or unwraps the selection in `marker`. Unwrapping handles both the case
 * where the markers sit inside the selection and where the selection sits
 * between them, so pressing Bold twice always returns the original text.
 */
export function toggleInline(value: string, start: number, end: number, marker: string): Edit {
  const selected = value.slice(start, end);
  const len = marker.length;

  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= len * 2) {
    const inner = selected.slice(len, -len);
    return {
      value: value.slice(0, start) + inner + value.slice(end),
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }

  if (start >= len && value.slice(start - len, start) === marker && value.slice(end, end + len) === marker) {
    return {
      value: value.slice(0, start - len) + selected + value.slice(end + len),
      selectionStart: start - len,
      selectionEnd: end - len,
    };
  }

  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    // With nothing selected the caret lands between the markers, ready to type.
    selectionStart: start + len,
    selectionEnd: end + len,
  };
}

/** Expands a selection to whole lines, which every block control works on. */
function lineRange(value: string, start: number, end: number) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = value.indexOf('\n', end);
  const to = nextBreak === -1 ? value.length : nextBreak;
  return { from, to };
}

/** Headings, quotes and bullets: add the prefix, or strip it if every line has it. */
export function toggleLinePrefix(value: string, start: number, end: number, prefix: string): Edit {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split('\n');
  const allPrefixed = lines.every((line) => line.startsWith(prefix));

  const next = lines
    .map((line) => (allPrefixed ? line.slice(prefix.length) : prefix + stripBlockPrefix(line)))
    .join('\n');

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

/** Numbered lists renumber from 1, so the markers stay correct after an edit. */
export function toggleOrderedList(value: string, start: number, end: number): Edit {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split('\n');
  const allNumbered = lines.every((line) => /^\d+\. /.test(line));

  const next = lines
    .map((line, i) =>
      allNumbered ? line.replace(/^\d+\. /, '') : `${i + 1}. ${stripBlockPrefix(line)}`,
    )
    .join('\n');

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

/**
 * Turns the selection into a link. With text selected the caret goes to the
 * empty URL so the address can be pasted straight in; with nothing selected it
 * selects the placeholder label instead, which is the part still to be written.
 */
export function insertLink(value: string, start: number, end: number): Edit {
  const selected = value.slice(start, end);
  const label = selected || 'link text';
  const snippet = `[${label}]()`;

  return {
    value: value.slice(0, start) + snippet + value.slice(end),
    selectionStart: selected ? start + snippet.length - 1 : start + 1,
    selectionEnd: selected ? start + snippet.length - 1 : start + 1 + label.length,
  };
}
