'use client';

import Link from 'next/link';
import { ArrowRight, Search, Zap } from 'lucide-react';
import { AetherFlowHero } from '@/components/ui/aether-flow-hero';
import { buttonClass } from '@/components/ui/primitives';

interface HomeHeroProps {
  tagline: string;
  postCount: number;
  latestBuild?: string | null;
}

export function HomeHero({ tagline, postCount, latestBuild }: HomeHeroProps) {
  return (
    <AetherFlowHero
      className="border-b border-border"
      badge={
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-4 py-1.5 backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          <span className="text-xs font-medium">
            {latestBuild ? `Latest coverage: ${latestBuild}` : 'Updated every weekday'}
          </span>
        </span>
      }
      title={
        <>
          Everyone is talking about it.
          <br />
          <span className="bg-gradient-to-b from-brand to-brand/55 bg-clip-text text-transparent">
            Here is what it means.
          </span>
        </>
      }
      description={tagline}
      actions={
        <>
          <Link href="/tech" className={buttonClass('primary', 'lg')}>
            Start reading
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/search" className={buttonClass('outline', 'lg')}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Search everything
          </Link>
        </>
      }
      footer={
        <dl className="mx-auto grid max-w-lg grid-cols-3 gap-4 text-center">
          <Stat label="Articles published" value={postCount.toLocaleString('en-GB')} />
          <Stat label="Sections covered" value="Eight" />
          <Stat label="Affiliate links" value="None" />
        </dl>
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-lg font-semibold tracking-tight">{value}</dd>
      <p aria-hidden="true" className="mt-1 text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
