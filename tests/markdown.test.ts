import { describe, expect, it } from 'vitest';
import { extractToc, renderMarkdown } from '@/lib/markdown';

describe('renderMarkdown sanitisation', () => {
  it('drops raw HTML in the markdown source', async () => {
    const html = await renderMarkdown('Hello <script>alert(1)</script> world');
    // The element is removed entirely. Its former contents survive only as
    // inert text, which is the correct outcome — nothing can execute.
    expect(html).not.toContain('<script');
    expect(html).toBe('<p>Hello alert(1) world</p>');
  });

  it('drops event handlers on any surviving element', async () => {
    const html = await renderMarkdown('<div onclick="steal()">click</div>');
    expect(html).not.toContain('onclick');
  });

  it('drops images, which must come from the screenshots field instead', async () => {
    const html = await renderMarkdown('![alt](https://evil.example/tracker.gif)');
    expect(html).not.toContain('<img');
  });

  it('drops iframes', async () => {
    const html = await renderMarkdown('<iframe src="https://evil.example"></iframe>');
    expect(html).not.toContain('<iframe');
  });

  it('keeps ordinary markdown formatting', async () => {
    const html = await renderMarkdown('## Heading\n\n**bold** and `code`\n\n1. one\n2. two');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ol>');
  });

  it('keeps GFM tables', async () => {
    const html = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<table>');
  });

  it('keeps the language class on fenced code blocks', async () => {
    const html = await renderMarkdown('```powershell\nGet-Service\n```');
    expect(html).toContain('language-powershell');
  });
});

describe('table of contents anchors', () => {
  /**
   * The sidebar contents is built from the markdown source while the heading
   * ids are produced by rehype-slug during rendering. If those two ever drift
   * apart every anchor on every article silently 404s within the page, so the
   * agreement is asserted directly rather than assumed.
   */
  const SOURCE = [
    '## Method 1: Free space on the System Reserved partition',
    '',
    'Some text.',
    '',
    '### Check the partition',
    '',
    '## Method 2: Reset the components',
    '',
    '## If nothing worked',
  ].join('\n');

  it('generates ids that match the rendered heading ids exactly', async () => {
    const html = await renderMarkdown(SOURCE);
    const renderedIds = [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    const tocIds = extractToc(SOURCE).map((entry) => entry.id);

    expect(tocIds).toEqual(renderedIds);
  });

  it('produces no "user-content-" prefixed ids', async () => {
    const html = await renderMarkdown(SOURCE);
    expect(html).not.toContain('user-content-');
  });

  it('keeps duplicate headings in sync between source and render', async () => {
    const source = '## Steps\n\ntext\n\n## Steps\n\nmore';
    const html = await renderMarkdown(source);
    const renderedIds = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    expect(extractToc(source).map((e) => e.id)).toEqual(renderedIds);
  });
});
