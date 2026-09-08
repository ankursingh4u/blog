import { describe, expect, it } from 'vitest';
import { checkStyle, describeStyle } from '../src/pipeline/style';

const rules = (text: string) => checkStyle(text).hits.map((h) => h.rule);

/** Padding so density and per-1,000-word maths have something to divide by. */
const filler = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');

describe('checkStyle — AI vocabulary', () => {
  it('flags the clustering vocabulary', () => {
    expect(rules(`This plays a crucial part in the landscape. ${filler}`)).toContain(
      'ai-vocabulary',
    );
  });

  it('is clean on ordinary prose', () => {
    expect(rules(`Open Settings and check the update history. ${filler}`)).toHaveLength(0);
  });
});

describe('checkStyle — constructions', () => {
  it('flags negative parallelism', () => {
    expect(rules(`It is not just faster, but also cheaper to run. ${filler}`)).toContain(
      'negative-parallelism',
    );
    expect(rules(`This is not only wrong but misleading. ${filler}`)).toContain(
      'negative-parallelism',
    );
  });

  it('flags copula avoidance', () => {
    expect(rules(`The partition serves as a staging area. ${filler}`)).toContain(
      'copula-avoidance',
    );
  });

  it('flags significance inflation', () => {
    expect(rules(`The release stands as a testament to the team. ${filler}`)).toContain(
      'significance-inflation',
    );
  });

  it('flags puffery', () => {
    expect(rules(`The groundbreaking, world-class device. ${filler}`)).toContain('puffery');
  });

  it('flags weasel attribution', () => {
    expect(rules(`Some argue the change was rushed. ${filler}`)).toContain('weasel-words');
  });

  it('flags self-reference', () => {
    expect(rules(`Note that the drive must be empty. ${filler}`)).toContain('self-reference');
  });
});

describe('checkStyle — em-dashes', () => {
  it('flags overuse', () => {
    const dashes = Array.from({ length: 12 }, () => 'a — b.').join(' ');
    const report = checkStyle(`${dashes} ${filler}`);
    expect(report.hits.map((h) => h.rule)).toContain('em-dash-overuse');
    expect(report.emDashesPer1000).toBeGreaterThan(6);
  });

  it('tolerates occasional use', () => {
    const report = checkStyle(`One dash — just here. ${filler}`);
    expect(report.hits.map((h) => h.rule)).not.toContain('em-dash-overuse');
  });
});

describe('checkStyle — code handling', () => {
  it('ignores fenced code blocks', () => {
    const text = `Ordinary prose. \`\`\`\nDISM /Online /Cleanup-Image /RestoreHealth\n\`\`\` ${filler}`;
    expect(rules(text)).toHaveLength(0);
  });

  it('ignores inline code', () => {
    // "key" inside inline code (a registry key) must not be flagged as vocabulary.
    expect(rules(`Run \`reg query HKLM\\key\` now. ${filler}`)).not.toContain('ai-vocabulary');
  });
});

describe('describeStyle', () => {
  it('reports clean prose', () => {
    expect(describeStyle(checkStyle(`Plain sentences only. ${filler}`))).toBe('Style clean.');
  });

  it('names the rules that fired', () => {
    expect(describeStyle(checkStyle(`A crucial, groundbreaking result. ${filler}`))).toContain(
      'puffery',
    );
  });
});
