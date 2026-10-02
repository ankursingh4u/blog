import { describe, expect, it } from 'vitest';

import { searchSeeds } from '@/pipeline/run';

/**
 * These cases are real headlines the pipeline produced, and the expectations
 * come from what Google autocomplete actually answered for each seed when they
 * were checked by hand. The point of the function is to turn a sentence nobody
 * types into a phrase somebody does.
 */
describe('searchSeeds', () => {
  it('drops the reporting verb and the grammar around it', () => {
    const seeds = searchSeeds('IHG revamps its credit card lineup with new benefits, higher annual fees');
    // "IHG revamps its credit card" returned nothing; this one returns the
    // queries that matter ("is ihg credit card worth it").
    expect(seeds[0]).toBe('IHG credit card lineup');
  });

  it('strips possessives, which otherwise match nothing', () => {
    const seeds = searchSeeds("U.S. FDA approves AbbVie's drug for Parkinson's disease");
    // "AbbVies" matched nothing and the headline fell through to the useless
    // two-word stub "US FDA".
    expect(seeds[0]).toContain('AbbVie');
    expect(seeds[0]).not.toContain('AbbVies');
  });

  it('tries the narrow seeds before the two-word stub', () => {
    const seeds = searchSeeds('U.S. FDA approves AbbVie drug for Parkinson disease');
    const stub = seeds.indexOf('US FDA');
    expect(stub).toBe(seeds.length - 1);
  });

  it('keeps a short headline usable', () => {
    expect(searchSeeds('Huawei Mate XT 2 tri-fold launch')[0]).toBe('Huawei Mate XT 2');
  });

  it('never returns an empty or one-character seed', () => {
    for (const phrase of ['The a an of', 'Says it is', '']) {
      for (const seed of searchSeeds(phrase)) expect(seed.length).toBeGreaterThan(2);
    }
  });
});
