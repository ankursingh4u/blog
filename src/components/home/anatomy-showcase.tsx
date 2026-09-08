'use client';

import { CheckCircle2, HelpCircle, ListOrdered, Zap } from 'lucide-react';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

/**
 * Shows the shape of every guide on the site, rendered inside the scroll-tilt
 * card. This is a real static rendering of the article template rather than a
 * screenshot, so it stays accurate as the template changes and costs no image
 * bytes.
 */
export function AnatomyShowcase() {
  return (
    <ContainerScroll
      titleComponent={
        <>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">
            Every guide, same shape
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Answer first.
            <br />
            <span className="text-muted-foreground">Explanation only if you want it.</span>
          </h2>
        </>
      }
    >
      <div className="h-full overflow-hidden p-5 text-left sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
            Error codes
          </span>
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
            Windows 11 · 26100.x
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-ok">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Tested on 26100.2314
          </span>
        </div>

        <p className="mt-4 text-xl font-bold tracking-tight sm:text-3xl">
          How to fix 0x800f0922 in Windows 11
        </p>

        <div className="mt-5 rounded-lg border border-brand/30 bg-brand/5 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <Zap className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            Quick answer
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            0x800f0922 almost always means the System Reserved partition is out of space or the
            update could not reach the servicing endpoint. Free 250 MB on the reserved partition,
            then retry the update.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Panel icon={<ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />} title="Method 1 — Free space on System Reserved">
            <Line w="92%" />
            <Line w="78%" />
            <Line w="85%" />
          </Panel>
          <Panel icon={<ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />} title="Method 2 — Reset the update components">
            <Line w="88%" />
            <Line w="70%" />
            <Line w="80%" />
          </Panel>
          <Panel icon={<HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />} title="If nothing worked">
            <Line w="75%" />
            <Line w="60%" />
          </Panel>
          <Panel icon={<HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />} title="FAQ">
            <Line w="82%" />
            <Line w="66%" />
          </Panel>
        </div>
      </div>
    </ContainerScroll>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <span className="text-brand">{icon}</span>
        {title}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Line({ w }: { w: string }) {
  return <div className="h-2 rounded-full bg-muted" style={{ width: w }} aria-hidden="true" />;
}
