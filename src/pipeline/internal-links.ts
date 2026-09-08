import { prisma } from '@/lib/db';

/**
 * Step 7 — internal links.
 *
 * Matches the generator's free-text suggestions to posts that actually exist,
 * then tops up from the same category. The editor confirms the final set, so
 * this only needs to be a good starting point — but it must never emit a slug
 * for a post that is not published, or the article renders a dead rail.
 */

const MIN_SIMILARITY = 0.28;

export async function suggestInternalLinks({
  suggestions,
  categoryId,
  excludeSlug,
  limit = 5,
}: {
  suggestions: string[];
  categoryId: string;
  excludeSlug?: string;
  limit?: number;
}): Promise<string[]> {
  const candidates = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
    },
    select: { slug: true, title: true, categoryId: true },
    orderBy: { publishedAt: 'desc' },
    take: 300,
  });
  if (candidates.length === 0) return [];

  const chosen: string[] = [];

  for (const suggestion of suggestions) {
    const scored = candidates
      .filter((c) => !chosen.includes(c.slug))
      .map((c) => ({
        slug: c.slug,
        // Same-category posts get a nudge: a related fix in the same category is
        // almost always a better link than a loose title match elsewhere.
        score: similarity(suggestion, c.title) + (c.categoryId === categoryId ? 0.12 : 0),
      }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score >= MIN_SIMILARITY) chosen.push(best.slug);
    if (chosen.length >= limit) break;
  }

  if (chosen.length < limit) {
    for (const candidate of candidates) {
      if (chosen.length >= limit) break;
      if (candidate.categoryId !== categoryId) continue;
      if (chosen.includes(candidate.slug)) continue;
      chosen.push(candidate.slug);
    }
  }

  return chosen.slice(0, limit);
}

/** Token-overlap (Dice) similarity. Cheap, and good enough for title matching. */
export function similarity(a: string, b: string): number {
  const left = tokenise(a);
  const right = tokenise(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'to', 'in', 'on', 'of', 'for', 'and', 'or', 'is', 'it',
  'how', 'what', 'why', 'your', 'you', 'with', 'after', 'not', 'fix', 'windows',
]);

function tokenise(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s.]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}
