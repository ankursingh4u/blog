import { describe, expect, it } from 'vitest';
import {
  decode,
  readFeedBody,
  extractBuildNumbers,
  extractErrorCodes,
  extractIdentifiers,
  extractKbNumbers,
  parseFeed,
  toKeywordCandidates,
} from '@/pipeline/parser';

describe('identifier extraction', () => {
  it('pulls KB numbers with and without a space', () => {
    expect(extractKbNumbers('Fixed in KB5044284 and KB 5043145.')).toEqual([
      'KB5044284',
      'KB5043145',
    ]);
  });

  it('is case-insensitive but normalises to uppercase KB', () => {
    expect(extractKbNumbers('see kb5044284')).toEqual(['KB5044284']);
  });

  it('rejects KB numbers that are too short to be real', () => {
    expect(extractKbNumbers('KB123 and KB12345')).toEqual([]);
  });

  it('deduplicates repeated identifiers', () => {
    expect(extractKbNumbers('KB5044284 … KB5044284 again')).toEqual(['KB5044284']);
  });

  it('reads builds with and without a revision', () => {
    expect(extractBuildNumbers('Builds 26100.2314 and 22631 are affected.')).toEqual([
      '26100.2314',
      '22631',
    ]);
  });

  it('lowercases error codes', () => {
    expect(extractErrorCodes('Error 0x800F0922 or 0X80070002')).toEqual([
      '0x800f0922',
      '0x80070002',
    ]);
  });

  it('returns empty arrays rather than throwing on empty input', () => {
    expect(extractIdentifiers('')).toEqual({
      kbNumbers: [],
      buildNumbers: [],
      errorCodes: [],
    });
  });
});

describe('decode', () => {
  it('unwraps CDATA and strips tags', () => {
    expect(decode('<![CDATA[<p>Hello <b>world</b></p>]]>')).toBe('Hello world');
  });

  it('resolves entities, ampersand last so &amp;lt; stays literal', () => {
    expect(decode('a &amp;lt; b')).toBe('a &lt; b');
    expect(decode('Tom &amp; Jerry &quot;quoted&quot;')).toBe('Tom & Jerry "quoted"');
  });

  // These reached the database intact and would have become article H1s. The
  // decoder resolved seven named entities and nothing numeric, and numeric is
  // the common form in publisher RSS.
  it('resolves numeric entities, decimal and hex', () => {
    expect(decode('Can &#8216;eSUV&#8217; e-bikes really go from trail to town?')).toBe(
      'Can ‘eSUV’ e-bikes really go from trail to town?',
    );
    expect(decode('caf&#233; and caf&#xe9;')).toBe('café and café');
  });

  it('resolves the typographic named entities publishers actually use', () => {
    expect(decode('It&rsquo;s a &ldquo;win&rdquo; &mdash; probably&hellip;')).toBe(
      'It’s a “win” — probably…',
    );
  });

  it('leaves an unknown entity alone rather than eating it', () => {
    expect(decode('a &notarealentity; b')).toBe('a &notarealentity; b');
  });

  it('discards a malformed numeric entity instead of throwing', () => {
    expect(decode('bad &#99999999999; end')).toBe('bad end');
  });

  it('repairs UTF-8 that was decoded as Latin-1', () => {
    expect(decode('GM canâ€™t â€˜bring backâ€™ Apple CarPlay')).toBe(
      'GM can’t ‘bring back’ Apple CarPlay',
    );
  });

  it('leaves text containing a legitimate accented character alone', () => {
    expect(decode('Beyoncé at the Château')).toBe('Beyoncé at the Château');
  });
});

describe('readFeedBody', () => {
  function response(body: Uint8Array, contentType: string): Response {
    // .buffer rather than the view: TextEncoder returns an exactly-sized
    // Uint8Array, and a view is not a BodyInit under this TS lib.
    return new Response(body.buffer as ArrayBuffer, {
      headers: { 'content-type': contentType },
    });
  }

  it('honours the XML declaration over the HTTP header', async () => {
    // UTF-8 bytes, but the server claims Latin-1 — the case that mangled
    // every apostrophe coming out of Google News.
    const xml = '<?xml version="1.0" encoding="utf-8"?><rss><title>can’t</title></rss>';
    const bytes = new TextEncoder().encode(xml);
    expect(await readFeedBody(response(bytes, 'text/xml; charset=iso-8859-1'))).toContain('can’t');
  });

  it('falls back to the HTTP charset when the document declares none', async () => {
    const xml = '<?xml version="1.0"?><rss><title>can’t</title></rss>';
    const bytes = new TextEncoder().encode(xml);
    expect(await readFeedBody(response(bytes, 'text/xml; charset=utf-8'))).toContain('can’t');
  });

  it('defaults to UTF-8 when neither says anything', async () => {
    const bytes = new TextEncoder().encode('<rss><title>can’t</title></rss>');
    expect(await readFeedBody(response(bytes, 'text/xml'))).toContain('can’t');
  });

  it('survives an encoding label Node does not recognise', async () => {
    const xml = '<?xml version="1.0" encoding="x-made-up"?><rss><title>ok</title></rss>';
    const bytes = new TextEncoder().encode(xml);
    expect(await readFeedBody(response(bytes, 'text/xml'))).toContain('ok');
  });
});

describe('parseFeed', () => {
  const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item>
        <title>KB5044284 known issue with Outlook</title>
        <link>https://example.com/kb5044284</link>
        <description><![CDATA[Devices on build 26100.2314 may fail with 0x800f0922.]]></description>
        <pubDate>Tue, 15 Oct 2024 10:00:00 GMT</pubDate>
      </item>
      <item>
        <title>No link here</title>
        <description>Should be skipped</description>
      </item>
    </channel></rss>`;

  it('reads RSS items and skips ones without a usable link', () => {
    const items = parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('KB5044284 known issue with Outlook');
    expect(items[0].link).toBe('https://example.com/kb5044284');
    expect(items[0].publishedAt).toBeInstanceOf(Date);
  });

  it('reads Atom entries and their href links', () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Windows 11 build 26120 rolls out</title>
        <link rel="alternate" href="https://example.com/26120"/>
        <summary>New build for Insiders.</summary>
        <updated>2024-10-15T10:00:00Z</updated>
      </entry>
    </feed>`;
    const items = parseFeed(atom);
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe('https://example.com/26120');
  });

  it('returns an empty array for input that is not a feed', () => {
    expect(parseFeed('<html><body>not a feed</body></html>')).toEqual([]);
  });
});

describe('toKeywordCandidates', () => {
  const item = {
    title: 'KB5044284 fails to install with error 0x800f0922',
    link: 'https://example.com/kb5044284',
    description: 'Devices on build 26100.2314 report the update failing.',
    publishedAt: new Date('2024-10-15T10:00:00Z'),
  };

  it('produces an error-code candidate carrying the real identifiers', () => {
    const candidates = toKeywordCandidates(item);
    const errorCandidate = candidates.find((c) => c.errorCode !== null);
    expect(errorCandidate).toBeDefined();
    expect(errorCandidate!.errorCode).toBe('0x800f0922');
    expect(errorCandidate!.kbNumber).toBe('KB5044284');
    expect(errorCandidate!.buildNumber).toBe('26100.2314');
    expect(errorCandidate!.sourceUrl).toBe(item.link);
  });

  // The Microsoft feeds are the troubleshooting path, so everything they
  // synthesise belongs to the Windows sub-section. The intent that used to pick
  // between five Windows categories now lives in the phrase instead.
  it('assigns every Microsoft-feed candidate to the windows sub-section', () => {
    const candidates = toKeywordCandidates(item);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.categorySlug === 'windows')).toBe(true);
  });

  it('phrases a failing update as a problem and a clean one as a release note', () => {
    const failing = toKeywordCandidates(item);
    expect(failing.some((c) => /not installing/i.test(c.phrase))).toBe(true);

    const released = toKeywordCandidates({
      ...item,
      title: 'KB5044284 released for Windows 11',
      description: 'This update includes quality improvements.',
    });
    expect(released.some((c) => /what's new/i.test(c.phrase))).toBe(true);
    expect(released.some((c) => /not installing/i.test(c.phrase))).toBe(false);
  });

  it('never invents an identifier that was not in the source text', () => {
    const candidates = toKeywordCandidates({
      ...item,
      title: 'Windows 11 gets a new Settings page',
      description: 'A general announcement with no identifiers.',
    });
    for (const candidate of candidates) {
      expect(candidate.kbNumber).toBeNull();
      expect(candidate.errorCode).toBeNull();
      expect(candidate.buildNumber).toBeNull();
    }
  });

  it('produces nothing for an item with no identifiers and no intent', () => {
    expect(
      toKeywordCandidates({
        ...item,
        title: 'A general company announcement',
        description: 'Nothing actionable here.',
      }),
    ).toEqual([]);
  });
});
