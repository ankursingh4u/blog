import { describe, expect, it } from 'vitest';

import {
  insertLink,
  toggleInline,
  toggleLinePrefix,
  toggleOrderedList,
} from '@/lib/markdown-format';

describe('toggleInline', () => {
  it('wraps the selection', () => {
    const r = toggleInline('hello world', 6, 11, '**');
    expect(r.value).toBe('hello **world**');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('world');
  });

  it('unwraps when the markers are inside the selection', () => {
    const r = toggleInline('hello **world**', 6, 15, '**');
    expect(r.value).toBe('hello world');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('world');
  });

  it('unwraps when the markers sit outside the selection', () => {
    const r = toggleInline('hello **world**', 8, 13, '**');
    expect(r.value).toBe('hello world');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('world');
  });

  it('is its own inverse', () => {
    const once = toggleInline('hello world', 6, 11, '_');
    const twice = toggleInline(once.value, once.selectionStart, once.selectionEnd, '_');
    expect(twice.value).toBe('hello world');
  });

  it('puts the caret between the markers when nothing is selected', () => {
    const r = toggleInline('ab', 1, 1, '**');
    expect(r.value).toBe('a****b');
    expect(r.selectionStart).toBe(3);
    expect(r.selectionEnd).toBe(3);
  });

  it('does not read past the start of the string', () => {
    const r = toggleInline('hi', 0, 2, '**');
    expect(r.value).toBe('**hi**');
  });
});

describe('toggleLinePrefix', () => {
  it('adds a heading marker to the line the caret is on', () => {
    const r = toggleLinePrefix('one\ntwo\nthree', 4, 4, '## ');
    expect(r.value).toBe('one\n## two\nthree');
  });

  it('removes the marker when every selected line already has it', () => {
    const r = toggleLinePrefix('## one\n## two', 0, 13, '## ');
    expect(r.value).toBe('one\ntwo');
  });

  it('replaces a different block marker rather than stacking one on top', () => {
    const r = toggleLinePrefix('> quoted', 0, 8, '## ');
    expect(r.value).toBe('## quoted');
  });

  it('applies to every line of a multi-line selection', () => {
    const r = toggleLinePrefix('a\nb\nc', 0, 5, '- ');
    expect(r.value).toBe('- a\n- b\n- c');
  });

  it('levels a partly-marked selection up rather than doubling the marker', () => {
    const r = toggleLinePrefix('- a\nb', 0, 5, '- ');
    expect(r.value).toBe('- a\n- b');
  });
});

describe('toggleOrderedList', () => {
  it('numbers from one', () => {
    const r = toggleOrderedList('a\nb\nc', 0, 5);
    expect(r.value).toBe('1. a\n2. b\n3. c');
  });

  it('renumbers rather than preserving stale markers', () => {
    const r = toggleOrderedList('7. a\n9. b', 0, 9);
    expect(r.value).toBe('a\nb');
  });

  it('converts bullets without doubling the marker', () => {
    const r = toggleOrderedList('- a\n- b', 0, 7);
    expect(r.value).toBe('1. a\n2. b');
  });
});

describe('insertLink', () => {
  it('keeps the selected text as the label and points the caret at the url', () => {
    const r = insertLink('see this', 4, 8);
    expect(r.value).toBe('see [this]()');
    expect(r.selectionStart).toBe(r.value.length - 1);
    expect(r.selectionStart).toBe(r.selectionEnd);
  });

  it('selects the placeholder label when nothing is selected', () => {
    const r = insertLink('', 0, 0);
    expect(r.value).toBe('[link text]()');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('link text');
  });
});
