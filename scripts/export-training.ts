import 'dotenv/config';
import { writeFileSync } from 'node:fs';

import { prisma } from '@/lib/db';
import { parseJson, FaqArray, StringArray } from '@/lib/json';

/**
 * Builds a fine-tuning file from the articles you approved.
 *
 * What this is for: making a small, cheap model write like the big one. A
 * fine-tune does not make tokens cheaper — a tuned model usually costs *more*
 * per token than its own base. It pays off in one specific way, which happens
 * to be exactly this situation: you teach `mini` the house style, stop paying
 * the flagship to work it out from a long prompt every time, and the per-article
 * bill falls because the expensive model is no longer in the loop.
 *
 * The training signal is already being collected. Every Approve in Telegram is
 * a human saying "this one was right", and every Reject says the opposite, so
 * the review queue is a labelling tool that happens to also publish a website.
 *
 *   npx tsx scripts/export-training.ts                 (dry run — counts only)
 *   npx tsx scripts/export-training.ts --out=train.jsonl
 *   npx tsx scripts/export-training.ts --min-score=85 --out=train.jsonl
 *
 * Then:  openai api fine_tuning.jobs.create -t train.jsonl -m <base-model>
 *
 * Rejected drafts are deliberately NOT included as negative examples. Supervised
 * fine-tuning learns to imitate what it is shown; showing it rejected work
 * teaches it to produce rejected work. They are counted here only so you can see
 * the ratio.
 *
 * How many examples: below ~50 approved articles a fine-tune mostly learns
 * noise. 100-200 is where house style starts to hold. There is no point running
 * this until the count below clears that bar — which is itself the reason to
 * keep the cheap model on a short leash until then.
 */

interface ChatExample {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

const SYSTEM = [
  'You write articles for a general-interest news site.',
  'Lead with what happened and why it matters, then the detail.',
  'Short paragraphs. Every figure, date and quote attributed to its source.',
  'Open with a two to three sentence quick answer, use an H2 per section, and',
  'close with 3-5 FAQ entries. No hype, no filler, never pad to reach a length.',
].join(' ');

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=')[1];
}

async function main() {
  const out = arg('out');
  const minScore = Number.parseInt(arg('min-score') ?? '0', 10) || 0;

  const approved = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      generatedBy: 'AI',
      ...(minScore > 0 ? { qualityScore: { gte: minScore } } : {}),
    },
    include: { category: true },
    orderBy: { publishedAt: 'asc' },
  });

  const rejected = await prisma.post.count({ where: { status: 'ARCHIVED' } });

  const examples: ChatExample[] = approved.map((post) => {
    const faq = parseJson(post.faq, FaqArray, []);
    const builds = parseJson(post.affectedBuilds, StringArray, []);

    // The user turn is reconstructed to look like what the pipeline will ask at
    // inference time. A fine-tune only transfers if the prompt shape matches.
    const user = [
      `SECTION: ${post.category.name}`,
      `TOPIC: ${post.title}`,
      builds.length ? `AFFECTED: ${builds.join(', ')}` : '',
      '',
      'Write the article.',
    ]
      .filter(Boolean)
      .join('\n');

    const assistant = [
      `# ${post.title}`,
      '',
      post.quickAnswer,
      '',
      post.body.trim(),
      '',
      '## FAQ',
      ...faq.map((item) => `**${item.question}**\n\n${item.answer}`),
    ].join('\n');

    return {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
        { role: 'assistant', content: assistant },
      ],
    };
  });

  console.log(`approved and usable : ${examples.length}`);
  console.log(`rejected (not used) : ${rejected}`);
  if (minScore > 0) console.log(`filtered to score    : >= ${minScore}`);

  if (examples.length < 50) {
    console.log(
      `\nNot enough yet. Below ~50 examples a fine-tune mostly learns noise;\n` +
        `100-200 is where a house style holds. Keep approving — the queue is\n` +
        `collecting this for you.`,
    );
  }

  if (!out) {
    console.log('\nDry run. Pass --out=train.jsonl to write the file.');
    return;
  }

  writeFileSync(out, examples.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${examples.length} example(s) to ${out}`);
  console.log('The file contains your published articles. Keep it out of the repo.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
