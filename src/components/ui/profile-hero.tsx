'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BlurText } from '@/components/ui/blur-text';

/**
 * Oversized-name profile hero with the avatar punched through the middle.
 *
 * Adapted from the `portfolio-hero` reference ("Profile cards"). Changes:
 *   - it is a presentational component driven by props, not a page that owns
 *     the nav, the theme toggle and its own hard-coded name. The header and
 *     theme switch live in the site shell, where there is exactly one of each;
 *   - the split name is a real `<h1>` — the reference renders the person's name
 *     as two `<p>` elements, which leaves the author page with no heading at
 *     all for Google or a screen reader;
 *   - the avatar is `next/image` with explicit dimensions, so it cannot shift
 *     layout as it loads;
 *   - hard-coded `#C3E41D` and inline Google Fonts are replaced with the theme
 *     accent and the site font stack; the reference's `<link>` to
 *     fonts.googleapis.com from inside a component would add a render-blocking
 *     third-party request on every page that used it.
 */

interface ProfileHeroProps {
  /** Rendered as two stacked lines. Usually ["FIRST", "LAST"]. */
  nameLines: [string, string];
  tagline: string;
  avatar?: string | null;
  avatarAlt?: string;
  eyebrow?: string;
  className?: string;
}

export function ProfileHero({
  nameLines,
  tagline,
  avatar,
  avatarAlt,
  eyebrow,
  className,
}: ProfileHeroProps) {
  return (
    <section
      className={cn(
        'relative flex min-h-[24rem] flex-col items-center justify-center overflow-hidden py-16 sm:min-h-[30rem]',
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}

      <div className="relative w-full text-center">
        {/* One heading, two visual lines. */}
        <h1 className="sr-only">{`${nameLines[0]} ${nameLines[1]}`}</h1>
        <div aria-hidden="true">
          {nameLines.map((line) => (
            <BlurText
              key={line}
              as="span"
              text={line}
              delay={70}
              animateBy="letters"
              direction="top"
              className="justify-center whitespace-nowrap font-mono text-[16vw] font-bold uppercase leading-[0.78] tracking-tighter text-brand sm:text-[13vw] lg:text-[10rem]"
              style={{ display: 'flex' }}
            />
          ))}
        </div>

        {avatar ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="h-[110px] w-[65px] overflow-hidden rounded-full shadow-2xl ring-1 ring-border transition-transform duration-300 hover:scale-105 sm:h-[152px] sm:w-[90px] lg:h-[218px] lg:w-[129px]">
              <Image
                src={avatar}
                alt={avatarAlt ?? ''}
                width={129}
                height={218}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex w-full justify-center px-6">
        <BlurText
          text={tagline}
          delay={90}
          animateBy="words"
          direction="top"
          className="max-w-2xl justify-center text-center text-base text-muted-foreground sm:text-lg"
        />
      </div>
    </section>
  );
}

export default ProfileHero;
