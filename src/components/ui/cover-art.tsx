import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Abstract cover art for in-page article cards.
 *
 * Posts have no photography — their only image is the generated OG card, which
 * has the headline drawn into the PNG. That card is the right asset for
 * `og:image`, where the text is the whole point, but it is the wrong asset for
 * an in-page thumbnail: every card ended up showing the headline twice, once
 * baked into the image and once as real text beside it, and at 104px the baked
 * text was unreadable noise. The lead card was worse still, cropping the
 * headline mid-word and printing the site's own hostname across the bottom.
 *
 * So in-page imagery is drawn, not fetched. The hue is derived from the seed —
 * the category slug — so a section keeps one identity across the whole site and
 * two sections next to each other never collide. Being CSS rather than an image
 * also means no extra request, nothing to go stale when a title is edited, and
 * no contribution to LCP, which matters given the Core Web Vitals budget.
 *
 * Fills its parent, so the parent needs `position: relative` and a size —
 * the same contract as `next/image` with `fill`.
 */

/**
 * The photograph to show for a post, or null to fall back to drawn cover art.
 *
 * A licence is what distinguishes a real photo from the generated OG card:
 * the card is stored in `featuredImage` too, but carries no credit. Checking
 * the licence rather than the path means the rule holds wherever the file
 * happens to live.
 */
export function coverPhoto(post: {
  featuredImage: string | null;
  imageCredit?: { license: string };
}): string | null {
  return post.imageCredit?.license && post.featuredImage ? post.featuredImage : null;
}

/** Stable small hash so a given seed always maps to the same hue. */
function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  // Keep the sweep in the violet-to-blue band around the brand colour rather
  // than letting it wander into muddy yellows and greens.
  return 232 + (h % 90);
}

export function CoverArt({ seed, className }: { seed: string; className?: string }) {
  const hue = hueFor(seed);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: `hsl(${hue} 42% 12%)`,
        backgroundImage: [
          `radial-gradient(120% 100% at 12% 8%, hsl(${hue} 84% 66% / 0.42) 0%, transparent 58%)`,
          `radial-gradient(90% 85% at 92% 96%, hsl(${(hue + 38) % 360} 76% 58% / 0.30) 0%, transparent 62%)`,
          `linear-gradient(135deg, hsl(${hue} 60% 20% / 0.85) 0%, hsl(${hue} 45% 10% / 0.95) 100%)`,
        ].join(', '),
      }}
    />
  );
}

/**
 * The cover for a card: the article's photograph if it has one, drawn cover art
 * if it does not.
 *
 * This exists because the choice was originally made at each call site, and only
 * `post-card` ever made it. Every homepage component — the lead story, the picks
 * rail, each section cluster — rendered `CoverArt` unconditionally, so when the
 * articles finally got photographs the homepage carried on showing gradients and
 * nothing looked broken enough to notice. Putting the decision in one place
 * means a caller cannot forget it.
 *
 * Fills its parent, so the parent needs `position: relative` and a size.
 * `sizes` should describe the rendered width, otherwise the browser downloads a
 * far larger file than the box needs.
 */
export function Cover({
  post,
  sizes,
  className,
}: {
  post: {
    featuredImage: string | null;
    imageCredit?: { license: string };
    category: { slug: string };
  };
  sizes: string;
  className?: string;
}) {
  const photo = coverPhoto(post);
  if (!photo) return <CoverArt seed={post.category.slug} className={className} />;

  return (
    <Image
      src={photo}
      alt=""
      fill
      sizes={sizes}
      className={cn('object-cover', className)}
    />
  );
}
