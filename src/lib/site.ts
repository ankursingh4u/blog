export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'FixDesk',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  description:
    'Trending stories explained properly — tech, entertainment, sport, money, health, gaming, travel and education.',
  locale: 'en_GB',
  twitter: '@fixdesk',
} as const;

export function absoluteUrl(path = '/') {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export const NAV_FOOTER = [
  { href: '/about', label: 'About' },
  { href: '/editorial-policy', label: 'Editorial policy' },
  { href: '/contact', label: 'Contact' },
  { href: '/feed.xml', label: 'RSS' },
] as const;
