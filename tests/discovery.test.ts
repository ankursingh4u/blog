import { describe, expect, it } from 'vitest';
import {
  NEWS_EDITIONS,
  VERTICAL_FEEDS,
  VERTICAL_SOURCES,
  classifyVertical,
  isRelevant,
  isTrustedGeneralHost,
  isTrustedHost,
  isUsefulSolutionUrl,
  stripPublisher,
} from '@/pipeline/discovery';
import {
  CATEGORY_SLUGS,
  newsItemToCandidate,
  newsPublisher,
  stripNewsPublisher,
} from '@/pipeline/parser';
import { phraseToCandidate } from '@/pipeline/ingest';

describe('solution source filtering', () => {
  const LEARN = 'https://learn.microsoft.com/en-us';

  it('accepts documentation paths', () => {
    expect(
      isUsefulSolutionUrl(
        `${LEARN}/troubleshoot/windows-client/installing-updates-features-roles/fix-windows-update-errors`,
        'Fix Windows Update errors',
        'windows update reset components',
      ),
    ).toBe(true);
  });

  /**
   * The case that matters: learn.microsoft.com/answers/ is community Q&A on a
   * Microsoft domain. A host allow-list waves it through, which is how a
   * Minecraft thread ended up as a research source for an error-code guide.
   */
  it('rejects community Q&A even though the host is Microsoft', () => {
    const url = `${LEARN}/answers/questions/5993227/how-to-change-lan-to-multiplayer-on-minecraft-java`;
    expect(isTrustedHost(url)).toBe(true);
    expect(isUsefulSolutionUrl(url, 'How to change LAN to multiplayer', '0x800f0922 error')).toBe(
      false,
    );
  });

  it('rejects an off-topic page outside the documentation trees', () => {
    expect(
      isUsefulSolutionUrl(
        `${LEARN}/azure/cost-management/pricing`,
        'Azure pricing overview',
        'outlook not opening after windows update',
      ),
    ).toBe(false);
  });

  it('accepts an on-topic page outside the doc trees when a distinctive term matches', () => {
    expect(
      isUsefulSolutionUrl(
        `${LEARN}/microsoft-365/outlook-crash`,
        'Outlook crashes on startup',
        'outlook not opening after windows update',
      ),
    ).toBe(true);
  });

  it('does not match on generic words alone', () => {
    expect(
      isUsefulSolutionUrl(
        `${LEARN}/dynamics365/sales/overview`,
        'Windows of opportunity in sales',
        'windows update error problem fix',
      ),
    ).toBe(false);
  });

  it('rejects a non-Microsoft host outright', () => {
    expect(isTrustedHost('https://randomforum.example/thread/1')).toBe(false);
    expect(
      isUsefulSolutionUrl('https://randomforum.example/troubleshoot/x', 'Fix', 'windows update'),
    ).toBe(false);
  });

  it('accepts the other trusted Microsoft properties', () => {
    expect(isTrustedHost('https://support.microsoft.com/en-us/help/1')).toBe(true);
    expect(isTrustedHost('https://blogs.windows.com/post')).toBe(true);
    expect(isTrustedHost('https://www.learn.microsoft.com/x')).toBe(true);
  });
});

describe('stripPublisher', () => {
  it('removes the trailing publisher Google News appends', () => {
    expect(stripPublisher('KB5044284 breaks printing - Ars Technica')).toBe(
      'KB5044284 breaks printing',
    );
  });

  it('handles en and em dashes', () => {
    expect(stripPublisher('Windows 11 update fails – Neowin')).toBe('Windows 11 update fails');
    expect(stripPublisher('Patch Tuesday roundup — BleepingComputer')).toBe(
      'Patch Tuesday roundup',
    );
  });

  it('leaves a headline with no publisher suffix alone', () => {
    expect(stripPublisher('Windows 11 update fails to install')).toBe(
      'Windows 11 update fails to install',
    );
  });

  it('does not eat a hyphenated word mid-headline', () => {
    expect(stripPublisher('Fixing the blue-screen loop on Windows 11')).toBe(
      'Fixing the blue-screen loop on Windows 11',
    );
  });
});

describe('classifyVertical', () => {
  it('routes a term to each of the eight verticals', () => {
    expect(classifyVertical('iPhone 17 battery life review')).toBe('tech');
    expect(classifyVertical('new Netflix season release date')).toBe('entertainment');
    expect(classifyVertical('India vs Australia test series')).toBe('sports');
    expect(classifyVertical('RBI holds interest rate')).toBe('money');
    expect(classifyVertical('how much sleep do adults need')).toBe('health');
    expect(classifyVertical('GTA 6 gameplay trailer')).toBe('gaming');
    expect(classifyVertical('cheapest flight to Dubai')).toBe('travel');
    expect(classifyVertical('NEET 2026 admission dates')).toBe('education');
  });

  // The regression that made this rewrite necessary: the old relevance check
  // required every term to mention Windows or Microsoft, so seven of the eight
  // verticals could never receive a keyword.
  it('no longer rejects everything that is not about Windows', () => {
    expect(classifyVertical('premier league results')).not.toBeNull();
    expect(isRelevant('premier league results')).toBe(true);
  });

  it('prefers the more specific windows sub-section over tech', () => {
    expect(classifyVertical('Windows 11 update stuck at 99%')).toBe('windows');
    expect(classifyVertical('KB5044284 not installing')).toBe('windows');
    expect(classifyVertical('0x800f0922 fix')).toBe('windows');
  });

  it('rejects terms that trend but make poor evergreen pages', () => {
    expect(classifyVertical('actor died today')).toBeNull();
    expect(classifyVertical('IPL match result today live')).toBeNull();
    expect(classifyVertical('dream11 team prediction')).toBeNull();
  });

  it('returns null rather than guessing for a term that fits nowhere', () => {
    expect(classifyVertical('weather tomorrow')).toBeNull();
  });
});

describe('newsItemToCandidate', () => {
  const item = {
    title: 'Why airfares spike during the festive season',
    link: 'https://news.google.com/rss/articles/CBMiK2h0dHBz',
    description: 'Airlines explain the pricing.',
    publishedAt: new Date('2026-09-08T06:00:00Z'),
  };

  it('keeps the caller-supplied vertical rather than re-sniffing the headline', () => {
    expect(newsItemToCandidate(item, 'travel')?.categorySlug).toBe('travel');
    expect(newsItemToCandidate(item, 'money')?.categorySlug).toBe('money');
  });

  // A headline is a topic, not a diagnosis. Attaching an identifier to one would
  // be an invented fact, which the editorial rules forbid outright.
  it('never attaches an identifier to a general news item', () => {
    const candidate = newsItemToCandidate(
      { ...item, title: 'Microsoft ships KB5044284 with error 0x800f0922 fixes' },
      'tech',
    );
    expect(candidate?.kbNumber).toBeNull();
    expect(candidate?.errorCode).toBeNull();
    expect(candidate?.buildNumber).toBeNull();
  });

  it('keeps the real article link as the source URL', () => {
    expect(newsItemToCandidate(item, 'travel')?.sourceUrl).toBe(item.link);
  });

  it('drops live blogs and photo galleries, which date immediately', () => {
    expect(newsItemToCandidate({ ...item, title: 'India vs Australia live updates' }, 'sports')).toBeNull();
    expect(newsItemToCandidate({ ...item, title: 'Paris fashion week in pictures' }, 'entertainment')).toBeNull();
  });

  it('drops headlines too short or too long to be a page title', () => {
    expect(newsItemToCandidate({ ...item, title: 'Budget 2026' }, 'money')).toBeNull();
    expect(newsItemToCandidate({ ...item, title: 'A'.repeat(140) }, 'money')).toBeNull();
  });
});

describe('stripNewsPublisher', () => {
  it('removes the publisher Google appends to every headline', () => {
    expect(stripNewsPublisher('Eiffel Tower shuts after strike - The Times of India')).toBe(
      'Eiffel Tower shuts after strike',
    );
  });

  it('leaves a hyphenated headline with no publisher tail intact', () => {
    expect(stripNewsPublisher('Samsung India begins job cuts')).toBe(
      'Samsung India begins job cuts',
    );
  });
});

describe('newsPublisher', () => {
  it('returns the masthead the stripper removes', () => {
    expect(newsPublisher('Eiffel Tower shuts after strike - The Times of India')).toBe(
      'The Times of India',
    );
  });

  it('returns null when the headline carries no publisher', () => {
    expect(newsPublisher('Samsung India begins job cuts')).toBeNull();
  });

  it('does not mistake a trailing sentence for a masthead', () => {
    // Same guard the stripper uses: a tail ending in sentence punctuation is
    // part of the headline, so neither function may touch it.
    const title = 'The rate decision is close - nobody knows which way it goes.';
    expect(newsPublisher(title)).toBeNull();
    expect(stripNewsPublisher(title)).toBe(title);
  });

  it('agrees with the stripper on what was removed', () => {
    const title = 'Liverpool target Frankfurt sporting director - BBC Sport';
    expect(stripNewsPublisher(title)).toBe('Liverpool target Frankfurt sporting director');
    expect(newsPublisher(title)).toBe('BBC Sport');
  });
});

describe('general-interest source hosts', () => {
  it('accepts the publishers behind the vertical feeds', () => {
    expect(isTrustedGeneralHost('https://www.bbc.co.uk/news/business-123')).toBe(true);
    expect(isTrustedGeneralHost('https://www.livemint.com/money/personal-finance/x')).toBe(true);
    expect(isTrustedGeneralHost('https://indianexpress.com/article/education/y')).toBe(true);
  });

  it('accepts the official bodies for a vertical', () => {
    expect(isTrustedGeneralHost('https://www.rbi.org.in/Scripts/BS_PressRelease.aspx')).toBe(true);
    expect(isTrustedGeneralHost('https://upsc.gov.in/examinations/results')).toBe(true);
    expect(isTrustedGeneralHost('https://www.who.int/news-room/fact-sheets/detail/obesity')).toBe(
      true,
    );
  });

  // The whole reason this rewrite exists: a Google News link is not a source.
  it('rejects Google News links and any host not on the list', () => {
    expect(isTrustedGeneralHost('https://news.google.com/rss/articles/CBMiK2h0')).toBe(false);
    expect(isTrustedGeneralHost('https://random-content-farm.example/post')).toBe(false);
  });

  it('gives every general vertical at least one publisher feed', () => {
    for (const source of VERTICAL_SOURCES) {
      expect(VERTICAL_FEEDS[source.slug]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('leaves windows to the Microsoft documentation route', () => {
    expect(VERTICAL_FEEDS.windows).toBeUndefined();
  });
});

describe('news editions and vertical coverage', () => {
  it('weights India ahead of the US edition', () => {
    expect(NEWS_EDITIONS[0].id).toBe('IN');
    expect(NEWS_EDITIONS[0].weight).toBeGreaterThan(NEWS_EDITIONS[1].weight);
  });

  it('covers every vertical with a section feed or a search query', () => {
    for (const source of VERTICAL_SOURCES) {
      expect(source.topic !== null || source.queries.length > 0).toBe(true);
    }
    expect(VERTICAL_SOURCES).toHaveLength(8);
  });
});

describe('phraseToCandidate', () => {
  it('lifts a real error code out of the phrase and routes to windows', () => {
    const candidate = phraseToCandidate('windows 11 error 0x800F0922 fix', 'google-suggest');
    expect(candidate.errorCode).toBe('0x800f0922');
    expect(candidate.categorySlug).toBe('windows');
  });

  it('lifts a KB number out of the phrase', () => {
    const candidate = phraseToCandidate('kb5044284 not installing', 'google-suggest');
    expect(candidate.kbNumber).toBe('KB5044284');
  });

  it('never invents an identifier that is not in the phrase', () => {
    const candidate = phraseToCandidate('windows update stuck at 99', 'google-suggest');
    expect(candidate.kbNumber).toBeNull();
    expect(candidate.errorCode).toBeNull();
    expect(candidate.buildNumber).toBeNull();
  });

  it('marks the origin instead of inventing a source URL', () => {
    const candidate = phraseToCandidate('windows update stuck', 'google-trends');
    expect(candidate.sourceUrl).toBe('discovery:google-trends');
    expect(candidate.sourceUrl.startsWith('http')).toBe(false);
  });

  it('routes Windows fix-it phrases to the windows sub-section', () => {
    expect(phraseToCandidate('how to disable windows update', 'x').categorySlug).toBe('windows');
    expect(phraseToCandidate('outlook crashing on windows 11', 'x').categorySlug).toBe('windows');
    expect(phraseToCandidate('windows update keeps failing', 'x').categorySlug).toBe('windows');
  });

  it('routes a general phrase to its own vertical', () => {
    expect(phraseToCandidate('cheapest time to fly to Goa', 'x').categorySlug).toBe('travel');
    expect(phraseToCandidate('how many steps a day to lose weight', 'x').categorySlug).toBe(
      'health',
    );
  });

  // The discovery channel knows which seed produced a phrase, and that beats
  // re-deriving the vertical from the words.
  it('honours a vertical supplied by the caller', () => {
    expect(phraseToCandidate('best settings for performance', 'x', 'gaming').categorySlug).toBe(
      'gaming',
    );
  });

  // Every keyword must land on a real Category row; a slug outside this set is
  // stored as a null category and can never be selected for generation.
  it('only ever produces a live category slug', () => {
    const phrases = [
      'windows update keeps failing',
      'cheapest time to fly to Goa',
      'something entirely unclassifiable',
    ];
    for (const phrase of phrases) {
      expect(CATEGORY_SLUGS).toContain(phraseToCandidate(phrase, 'x').categorySlug);
    }
  });

  it('capitalises the phrase for display', () => {
    expect(phraseToCandidate('windows update stuck', 'x').phrase).toBe('Windows update stuck');
  });
});
