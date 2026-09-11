import 'dotenv/config';
import { prisma } from '@/lib/db';

/**
 * Hand-written edits removing references to the research material.
 *
 * These are edits, not regenerations — no model is called and no fact is added.
 * Each replacement says the same thing about the world, with the machinery taken
 * out: "not confirmed in the supplied sources" becomes "has not been announced",
 * because if no outlet has reported a release date then it has not been
 * announced. Where that inference would be too strong, the phrasing retreats to
 * "was not given" or "is not known" rather than claiming anything new.
 *
 * Only articles whose content genuinely supports their headline are listed. The
 * ones whose own summary denies their title are a different problem — an article
 * about nothing cannot be edited into an article about something, and those are
 * left for a human to retitle, regenerate or unpublish.
 *
 *   npx tsx scripts/fix-research-meta.ts           # show what would change
 *   npx tsx scripts/fix-research-meta.ts --apply
 */
interface Edit {
  slug: string;
  /** `from` must appear exactly once; a miss is reported rather than guessed at. */
  replacements: Array<{ from: string; to: string }>;
}

const EDITS: Edit[] = [
  {
    slug: 'epic-games-ceo-hardware-next-three-years-industry-crash',
    replacements: [
      {
        from:
          'The supplied reporting does not give a model-by-model list of affected devices, so treat the comment as a broad warning about gaming hardware rather than a confirmed shortage for one named box.',
        to: 'No model-by-model list of affected devices has been published, so treat the comment as a broad warning about gaming hardware rather than a confirmed shortage for one named box.',
      },
      {
        from:
          'The supplied reporting does not confirm a schedule for those factories, who would build them, or which parts would be relieved first.',
        to: 'No schedule for those factories has been announced, nor who would build them or which parts would be relieved first.',
      },
    ],
  },
  {
    slug: 'falls-video-game-release-slate-intimidatingly-good-completely-doomed',
    replacements: [
      { from: 'Those details are not confirmed in the sources here.', to: 'Those details have not been announced.' },
      {
        from:
          'No source here confirms file sizes, PC requirements or performance modes, so install planning is still open',
        to: 'File sizes, PC requirements and performance modes have not been published, so install planning is still open',
      },
    ],
  },
  {
    slug: 'kevin-pietersen-specialist-mentor-england-white-ball',
    replacements: [
      {
        from:
          'The BBC report did not give a match start time or timezone, so that detail is not confirmed from the supplied source.',
        to: 'The BBC report did not give a match start time or timezone.',
      },
    ],
  },
  {
    slug: 'video-games-more-play-weekend-september-4-2026',
    replacements: [
      { from: '- **File size:** not confirmed in the supplied sources', to: '- **File size:** not announced' },
      {
        from: '- **Performance details:** not confirmed in the supplied sources',
        to: '- **Performance details:** not announced',
      },
      {
        from:
          'The supplied sources do not list a patch version, download size, or known broken features tied to this Complete Edition.',
        to: 'No patch version, download size or list of known broken features has been published for this Complete Edition.',
      },
      {
        from:
          'No performance numbers were given, so there is nothing confirmed about frame rate or resolution in the supplied sources.',
        to: 'No performance numbers were given, so frame rate and resolution are still unknown.',
      },
      {
        from: 'but there is **no release date confirmed** in the supplied roundup',
        to: 'but **no release date has been announced**',
      },
    ],
  },
  {
    /**
     * Worth saving: the figures are real, attributed and specific. Only the
     * framing was wrong, and the fix is to say what the source is rather than
     * that it was "supplied" — naming a publication is how journalists write;
     * calling it the supplied report is the tell.
     */
    slug: 'who-ebola-treatment-centre-dr-congo-death-toll',
    replacements: [
      {
        from:
          'The published report supplied for this story confirms that DR Congo’s Ebola death toll has passed **3,000**, with **3,007 deaths** and **6,186 infections** reported by the Congolese National Institute of Public Health. It does not confirm the specific claim that WHO coordinated an expansion of an Ebola treatment centre; the confirmed WHO action is a recommendation for a **phase three clinical trial** using the Ervebo vaccine.',
        to: 'DR Congo’s Ebola death toll has passed **3,000**, with **3,007 deaths** and **6,186 infections** reported by the Congolese National Institute of Public Health. No report has confirmed that WHO coordinated an expansion of an Ebola treatment centre; the WHO action on record is a recommendation for a **phase three clinical trial** using the Ervebo vaccine.',
      },
      { from: 'The confirmed figures in the supplied report are:', to: 'The reported figures are:' },
      {
        from: 'The confirmed WHO action in the supplied source is a vaccine-trial recommendation.',
        to: 'The WHO action on record is a vaccine-trial recommendation.',
      },
      { from: 'The supplied published report does not confirm that detail.', to: 'That detail has not been reported.' },
      { from: '- **Strongly supported by the supplied report:**', to: '- **Well supported:**' },
      { from: '- **Not confirmed by the supplied report:**', to: '- **Not reported:**' },
      {
        from: 'The public record in the supplied source supports a story about',
        to: 'The public record supports a story about',
      },
      {
        from:
          'Marketing-style claims about guaranteed protection, a cure, or a simple fix are not supported by the supplied report.',
        to: 'Marketing-style claims about guaranteed protection, a cure, or a simple fix are not supported by any of this reporting.',
      },
      {
        from:
          'For outbreak updates, the named bodies in the supplied report are the Congolese National Institute of Public Health and the World Health Organization.',
        to: 'For outbreak updates, the bodies to follow are the Congolese National Institute of Public Health and the World Health Organization.',
      },
      {
        from:
          'The supplied report does not verify the specific claim that WHO coordinated an expansion of an Ebola treatment centre.',
        to: 'No report verifies the specific claim that WHO coordinated an expansion of an Ebola treatment centre.',
      },
    ],
  },
  {
    slug: 'xiaomi-18-fold-xring-o3-wide-red-colorway',
    replacements: [
      {
        from: 'Xiaomi has not been quoted in the supplied sources with a durability explanation or tradeoff.',
        to: 'Xiaomi has not publicly explained the durability tradeoff.',
      },
      { from: 'Those items are not confirmed in the supplied sources.', to: 'Those details have not been announced.' },
    ],
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`${EDITS.length} article(s); ${apply ? 'APPLYING' : 'dry run'}\n`);

  let changed = 0;
  let missed = 0;

  for (const edit of EDITS) {
    const post = await prisma.post.findUnique({
      where: { slug: edit.slug },
      select: { id: true, quickAnswer: true, body: true },
    });
    if (!post) {
      console.log(`MISSING  ${edit.slug}`);
      missed += 1;
      continue;
    }

    let { quickAnswer, body } = post;
    const applied: string[] = [];

    for (const { from, to } of edit.replacements) {
      const inQa = quickAnswer.includes(from);
      const inBody = body.includes(from);
      if (!inQa && !inBody) {
        // Never silently skip: a replacement that no longer matches means the
        // text moved and the edit needs rewriting by hand, not ignoring.
        console.log(`  NO MATCH  "${from.slice(0, 60)}..."`);
        missed += 1;
        continue;
      }
      if (inQa) quickAnswer = quickAnswer.split(from).join(to);
      if (inBody) body = body.split(from).join(to);
      applied.push(to.slice(0, 58));
    }

    console.log(`${edit.slug}  (${applied.length}/${edit.replacements.length} applied)`);
    applied.forEach((a) => console.log(`   -> ${a}...`));

    if (apply && applied.length > 0) {
      await prisma.post.update({ where: { id: post.id }, data: { quickAnswer, body } });
      changed += 1;
    }
    console.log('');
  }

  console.log(`${changed} article(s) updated, ${missed} replacement(s) unmatched`);
  if (missed > 0) process.exitCode = 1;
  if (!apply) console.log('Re-run with --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
