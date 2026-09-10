/**
 * How an article gets from a source to a published page.
 * This is the public-facing version of the pipeline in src/pipeline — keep the
 * two in step when the pipeline changes.
 *
 * This was a sticky-scroll reveal: a fixed-height box with its own scrollbar and
 * a coloured panel that swapped as you scrolled inside it. Three things were
 * wrong with it. The nested scroll container trapped the page scroll in a 30rem
 * box; the panel tracked `scrollYProgress` with an offset that reported
 * near-complete progress immediately, so it sat on step four while steps one and
 * two were on screen; and the panel itself only repeated the step title in a
 * saturated gradient that matched nothing else on the page.
 *
 * The component already had a `prefers-reduced-motion` branch that rendered the
 * steps as a plain grid, and that branch was simply better. It is now the only
 * one. Four short steps do not need choreography to be read in order.
 */
const STEPS = [
  {
    title: 'We watch what people are asking',
    description:
      'Trend, news and search-suggestion feeds are polled every morning across every section we cover. Topics are pulled out, deduplicated and validated before anything is written. Nothing gets drafted from a rumour alone.',
  },
  {
    title: 'We read the primary sources',
    description:
      'Before a word is drafted, three to five sources are collected — official documentation, published research and primary reporting first. Every claim has to trace back to one of them, and they are all listed at the bottom of the article.',
  },
  {
    title: 'A quality gate scores the draft',
    description:
      'Each draft is scored on accuracy against those sources, structure, thinness, and whether it invented anything. A draft that states a figure, date or identifier that is not in the sources is blocked outright, whatever else it scored.',
  },
  {
    title: 'A human checks it and publishes',
    description:
      'A person reviews the draft against its sources before anything goes live, and step-by-step guides get run through on a real device. Published pages carry the author and the date they were last verified, both visible at the top.',
  },
];

export function ProcessSection() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {STEPS.map((step, index) => (
        <li key={step.title} className="surface flex gap-5 p-6">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-sm font-semibold text-brand"
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-snug tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
