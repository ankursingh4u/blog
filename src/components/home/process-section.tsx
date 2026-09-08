'use client';

import { StickyScroll } from '@/components/ui/sticky-scroll-reveal';

/**
 * How an article gets from a source to a published page.
 * This is the public-facing version of the pipeline in src/pipeline — keep the
 * two in step when the pipeline changes.
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
  return <StickyScroll content={STEPS} />;
}
