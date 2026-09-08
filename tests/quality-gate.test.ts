import { describe, expect, it } from 'vitest';
import { auditIdentifiers } from '@/pipeline/quality-gate';

/**
 * The identifier audit is the one check that must never fail open — a draft
 * that names a KB number Microsoft never shipped is blocked regardless of how
 * well it scores. These tests pin that behaviour.
 */

const baseDraft = {
  title: 'How to fix 0x800f0922 in Windows 11',
  quickAnswer: 'Free space on the System Reserved partition, then retry the update.',
  body: '## Method 1: Free space\n\nSteps here.\n\n## If nothing worked\n\nContact support.',
  metaDescription: 'A fix for the 0x800f0922 Windows Update error.',
  affectedBuilds: [] as string[],
  faq: [{ question: 'Is this safe?', answer: 'Yes, the first method is non-destructive.' }],
};

const SOURCES =
  'Microsoft has documented error 0x800f0922 affecting KB5044284 on build 26100.2314 of Windows 11.';

describe('auditIdentifiers', () => {
  it('passes a draft whose identifiers all appear in the sources', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, body: `${baseDraft.body}\n\nApplies to KB5044284 on 26100.2314.` },
      SOURCES,
      [],
    );
    expect(audit.blocked).toBe(false);
    expect(audit.hallucinated.kbNumbers).toEqual([]);
  });

  it('blocks a KB number that appears nowhere in the sources', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, body: `${baseDraft.body}\n\nSee also KB9999999.` },
      SOURCES,
      [],
    );
    expect(audit.blocked).toBe(true);
    expect(audit.hallucinated.kbNumbers).toEqual(['KB9999999']);
  });

  it('blocks an invented error code', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, body: `${baseDraft.body}\n\nMay also show 0xdeadbeef.` },
      SOURCES,
      [],
    );
    expect(audit.blocked).toBe(true);
    expect(audit.hallucinated.errorCodes).toContain('0xdeadbeef');
  });

  it('accepts an identifier supplied as verified even if it is not in the sources', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, body: `${baseDraft.body}\n\nFixed by KB5043145.` },
      SOURCES,
      ['KB5043145'],
    );
    expect(audit.blocked).toBe(false);
  });

  it('treats a bare build major as matching a revision in the sources', () => {
    const audit = auditIdentifiers({ ...baseDraft, affectedBuilds: ['26100'] }, SOURCES, []);
    expect(audit.blocked).toBe(false);
  });

  it('blocks a build family that is genuinely absent', () => {
    const audit = auditIdentifiers({ ...baseDraft, affectedBuilds: ['19045.1234'] }, SOURCES, []);
    expect(audit.blocked).toBe(true);
    expect(audit.hallucinated.buildNumbers).toContain('19045.1234');
  });

  it('scans the FAQ, not just the body', () => {
    const audit = auditIdentifiers(
      {
        ...baseDraft,
        faq: [{ question: 'What about KB5099999?', answer: 'It is unrelated.' }],
      },
      SOURCES,
      [],
    );
    expect(audit.blocked).toBe(true);
    expect(audit.hallucinated.kbNumbers).toContain('KB5099999');
  });

  it('scans the title and meta description', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, title: 'How to fix 0x8007ffff in Windows 11' },
      SOURCES,
      [],
    );
    expect(audit.blocked).toBe(true);
    expect(audit.hallucinated.errorCodes).toContain('0x8007ffff');
  });

  it('is case-insensitive when matching against the sources', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, body: `${baseDraft.body}\n\nError 0x800F0922 again.` },
      SOURCES,
      [],
    );
    expect(audit.blocked).toBe(false);
  });

  it('blocks every identifier when there were no sources at all', () => {
    const audit = auditIdentifiers(
      { ...baseDraft, body: `${baseDraft.body}\n\nKB5044284 is affected.` },
      '',
      [],
    );
    expect(audit.blocked).toBe(true);
  });

  it('passes a draft that names no identifiers even with no sources', () => {
    const audit = auditIdentifiers(
      {
        ...baseDraft,
        title: 'How to reset Windows Update components',
        metaDescription: 'Reset the Windows Update components when an update refuses to install.',
      },
      '',
      [],
    );
    expect(audit.blocked).toBe(false);
  });
});
