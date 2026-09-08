/**
 * `npx tsx scripts/audit-style.ts [categorySlug…]`
 *
 * Runs the prose style checker over every published post and reports the tells
 * it finds, worst first. See src/pipeline/style.ts for what is checked and why.
 */
import { prisma } from '../src/lib/db';
import { checkStyle } from '../src/pipeline/style';

async function main() {
  const filter = process.argv.slice(2);

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, body: true, quickAnswer: true, category: { select: { slug: true } } },
    orderBy: { publishedAt: 'desc' },
  });

  const scoped = filter.length ? posts.filter((p) => filter.includes(p.category.slug)) : posts;

  const ruleTotals = new Map<string, number>();
  const termTotals = new Map<string, number>();
  const rows: Array<{ slug: string; density: number; dashes: number; summary: string }> = [];

  for (const post of scoped) {
    const report = checkStyle(`${post.quickAnswer}\n\n${post.body}`);
    for (const h of report.hits) {
      ruleTotals.set(h.rule, (ruleTotals.get(h.rule) ?? 0) + h.count);
      for (const m of h.matches) termTotals.set(m, (termTotals.get(m) ?? 0) + 1);
    }
    rows.push({
      slug: post.slug,
      density: report.density,
      dashes: report.emDashesPer1000,
      summary: report.hits.map((h) => `${h.rule}:${h.count}`).join(' '),
    });
  }

  console.log(`Scope: ${scoped.length} post(s)\n`);

  console.log('Totals by rule:');
  [...ruleTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([rule, n]) => console.log(`  ${rule.padEnd(24)} ${n}`));

  console.log('\nMost frequent flagged terms:');
  [...termTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([term, n]) => console.log(`  ${term.padEnd(24)} in ${n} post(s)`));

  const avgDash = rows.reduce((s, r) => s + r.dashes, 0) / (rows.length || 1);
  console.log(`\nAverage em-dashes per 1,000 words: ${avgDash.toFixed(1)} (target under 6)`);
  console.log(`Posts over the em-dash threshold: ${rows.filter((r) => r.dashes > 6).length}`);

  console.log('\nWorst 15 by flagged density (per 1,000 words):');
  rows
    .sort((a, b) => b.density - a.density)
    .slice(0, 15)
    .forEach((r) =>
      console.log(`  ${r.density.toFixed(1).padStart(5)}  ${r.slug.padEnd(48)} ${r.summary}`),
    );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
