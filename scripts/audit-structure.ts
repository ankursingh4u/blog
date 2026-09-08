/**
 * `npx tsx scripts/audit-structure.ts [categorySlug…]`
 *
 * Runs the pipeline's own structure checker over every published post, so the
 * back-catalogue is measured against exactly the rules new posts must pass.
 * Without an argument it reports on everything; with one or more category slugs
 * it reports only those.
 */
import { prisma } from '../src/lib/db';
import { checkStructure, MIN_WORDS } from '../src/pipeline/structure';

async function main() {
  const filter = process.argv.slice(2);

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, body: true, category: { select: { slug: true } } },
    orderBy: { publishedAt: 'desc' },
  });

  const scoped = filter.length
    ? posts.filter((p) => filter.includes(p.category.slug))
    : posts;

  const ruleCounts = new Map<string, number>();
  const rows: Array<{ slug: string; cat: string; words: number; issues: string[] }> = [];
  let passing = 0;

  for (const post of scoped) {
    const report = checkStructure(post.body);
    if (report.ok) passing += 1;
    for (const issue of report.issues) {
      ruleCounts.set(issue.rule, (ruleCounts.get(issue.rule) ?? 0) + 1);
    }
    rows.push({
      slug: post.slug,
      cat: post.category.slug,
      words: report.wordCount,
      issues: report.issues.map((i) => i.rule),
    });
  }

  console.log(`Scope: ${scoped.length} post(s)${filter.length ? ` in ${filter.join(', ')}` : ''}`);
  console.log(`Passing (no blocking issues): ${passing} / ${scoped.length}\n`);

  console.log('Issues by rule:');
  [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([rule, count]) => console.log(`  ${rule.padEnd(20)} ${count}`));

  const failing = rows.filter((r) => r.issues.length > 0).sort((a, b) => a.words - b.words);
  console.log(`\nNot yet compliant: ${failing.length} (floor is ${MIN_WORDS} words)`);
  failing.forEach((r) =>
    console.log(
      `  ${String(r.words).padStart(5)}w  ${r.cat.padEnd(10)} ${r.slug.padEnd(48)} ${r.issues.join(', ')}`,
    ),
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
