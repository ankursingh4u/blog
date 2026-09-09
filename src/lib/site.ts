export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Favo News',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  description:
    'Trending stories explained properly — tech, entertainment, sport, money, health, gaming, travel and education.',
  locale: 'en_GB',
  twitter: '@favonews',
  /** Where readers write in. Also the address publishers see in `contactUrl`. */
  email: 'hello@favo.news',
} as const;

export function absoluteUrl(path = '/') {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The User-Agent every outbound fetch identifies itself with — feeds, research
 * sources and image lookups alike.
 *
 * It carries a real, reachable URL on purpose. This string is what a publisher
 * sees in their access logs when we read their RSS or fetch a page we intend to
 * cite, and it is the only way for them to work out who we are or ask us to
 * stop. It previously pointed at example.com, which told them nothing.
 *
 * Derived from SITE.url so it follows the deployment rather than going stale;
 * it falls back to the production domain when the site URL is localhost, since
 * a publisher cannot visit `http://localhost:3000/about`.
 */
export function botUserAgent(): string {
  const base = SITE.url.includes('localhost') ? 'https://favo.news' : SITE.url;
  return `FavoBot/0.1 (+${base}/about)`;
}

export const NAV_FOOTER = [
  { href: '/about', label: 'About' },
  { href: '/editorial-policy', label: 'Editorial policy' },
  { href: '/contact', label: 'Contact' },
  { href: '/feed.xml', label: 'RSS' },
] as const;
