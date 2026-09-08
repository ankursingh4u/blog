/**
 * Locates an H2 section inside a markdown body.
 *
 * Split out of the actions module because a `'use server'` file may only
 * export async functions — and because this is pure string work worth testing
 * on its own.
 */
export function extractSection(
  body: string,
  heading: string,
): { start: number; end: number; text: string } | null {
  const lines = body.split('\n');
  const target = heading.trim();
  let started = false;
  let startOffset = 0;
  let offset = 0;

  for (const line of lines) {
    if (!started) {
      if (/^##\s+/.test(line) && line.replace(/^##\s+/, '').trim() === target) {
        started = true;
        startOffset = offset;
      }
    } else if (/^##\s+/.test(line)) {
      return { start: startOffset, end: offset, text: body.slice(startOffset, offset) };
    }
    offset += line.length + 1;
  }

  if (!started) return null;
  return { start: startOffset, end: body.length, text: body.slice(startOffset) };
}

/** Lists the H2 headings in a body, for the regenerate-section picker. */
export function listSections(body: string): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}
