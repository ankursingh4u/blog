import { describe, expect, it } from 'vitest';
import { checkPadding, describePadding, proseSentences, sections } from '../src/pipeline/padding';

/**
 * Genuinely varied prose.
 *
 * An earlier version of this helper built sentences from a template with the
 * nouns swapped, which the detector correctly read as restatement — the fixture
 * was padding. Each line here shares almost no vocabulary with the others.
 */
const POOL = [
  'Ticket prices rose again in March, the third increase since the franchise changed hands.',
  'Drivers reported queues stretching past the bypass junction well before dawn.',
  'A separate audit questioned how overtime had been recorded across two depots.',
  'The eastern platform reopened without the lifts that were promised alongside it.',
  'Weekend engineering work now finishes an hour later than the published timetable claims.',
  'Season pass holders were offered vouchers rather than refunds for cancelled services.',
  'Cycle storage at the interchange remains closed pending a fire safety assessment.',
  'Night buses replaced two branch lines throughout the summer shutdown.',
  'Revenue from parking fell sharply once the contactless barriers were installed.',
  'Staff shortages hit catering first, then spread to platform assistance roles.',
  'An independent panel will publish its findings before the next fare review.',
  'Freight operators want overnight paths that passenger timetables currently occupy.',
  'Accessibility complaints doubled after the ramp at the southern entrance was removed.',
  'Local councillors asked for quarterly punctuality figures rather than annual summaries.',
  'Rolling stock due for retirement has been kept in service another two winters.',
  'Ventilation upgrades in the tunnels slipped behind schedule by roughly five months.',
  'Compensation claims are now processed online, though paper forms remain available.',
  'A pilot scheme lets commuters reserve seats on the busiest morning departures.',
  'Signalling faults accounted for more delay minutes than weather did last year.',
  'Retail units inside the concourse have struggled since footfall patterns shifted.',
];

/** `n` distinct sentences, starting from `seed` in the pool. */
function distinctSentences(n: number, seed = 0): string {
  return Array.from({ length: n }, (_, i) => POOL[(i + seed) % POOL.length]).join(' ');
}

describe('proseSentences', () => {
  it('drops headings, list items and code', () => {
    const body = [
      '## A heading that is not prose',
      'The regulator published the schedule after review.',
      '- a list item that repeats the frame',
      '- a list item that repeats the frame',
      '```\nnet stop wuauserv\n```',
      'The operator withdrew the notice.',
    ].join('\n\n');

    const out = proseSentences(body);
    expect(out).toHaveLength(2);
    expect(out.join(' ')).not.toContain('list item');
    expect(out.join(' ')).not.toContain('wuauserv');
  });
});

describe('sections', () => {
  it('splits on H2 and H3 and keeps headings with their text', () => {
    const body = '## First\nalpha beta\n\n### Second\ngamma delta';
    const out = sections(body);
    expect(out.map((s) => s.heading)).toEqual(['First', 'Second']);
    expect(out[0].text).toContain('alpha');
  });
});

describe('checkPadding', () => {
  it('passes an article that says each thing once', () => {
    // Ten each, from opposite halves of the pool — the two sections must not
    // share sentences or they are correctly flagged as duplicates.
    const report = checkPadding(`## One\n\n${distinctSentences(10, 0)}\n\n## Two\n\n${distinctSentences(10, 10)}`);
    expect(report.ok).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it('blocks an article that restates the same sentence to reach length', () => {
    const echo = 'The regulator delayed the licence decision until the autumn review concludes.';
    // Ten sentences, six of them the same claim reworded barely at all.
    const body = [
      '## One',
      [echo, echo, echo, echo, echo, echo, distinctSentences(4)].join(' '),
    ].join('\n\n');

    const report = checkPadding(body);
    expect(report.ok).toBe(false);
    expect(report.issues.map((i) => i.rule)).toContain('repeated-sentences');
    expect(report.repeatedPairs).toBeGreaterThan(0);
  });

  it('blocks two sections covering the same ground', () => {
    const text = distinctSentences(14);
    const report = checkPadding(`## What happened\n\n${text}\n\n## A closer look\n\n${text}`);
    expect(report.ok).toBe(false);
    expect(report.issues.map((i) => i.rule)).toContain('duplicate-sections');
  });

  it('does not punish a comparison list for repeating its frame', () => {
    const rows = Array.from(
      { length: 12 },
      (_, i) => `- Battery life: model ${i} runs for ${i + 4} hours on a charge.`,
    ).join('\n');
    const report = checkPadding(`## Comparison\n\n${distinctSentences(12)}\n\n${rows}`);
    expect(report.ok).toBe(true);
  });

  it('ignores short sentences that cannot be judged', () => {
    const body = `## One\n\nIt did. It did. It did. It did.\n\n${distinctSentences(12)}`;
    const report = checkPadding(body);
    expect(report.ok).toBe(true);
  });
});

describe('describePadding', () => {
  it('reports a clean body', () => {
    expect(describePadding(checkPadding(`## One\n\n${distinctSentences(16)}`))).toMatch(/^Padding OK/);
  });

  it('names the blocking rule and shows an example pair', () => {
    const echo = 'The tribunal approved the tender documents despite the outstanding objection.';
    const text = describePadding(
      checkPadding(`## One\n\n${[echo, echo, echo, echo, echo, echo, distinctSentences(4)].join(' ')}`),
    );
    expect(text).toContain('BLOCKING');
    expect(text).toContain('repeated-sentences');
    expect(text).toContain('≈');
  });
});
