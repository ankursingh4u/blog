/**
 * Who the masthead is, and who signs what.
 *
 * One list, used by three places that must never disagree: the author rotation
 * in the pipeline, the "Who writes here" section on /about, and the seed task
 * that creates the rows. When these drifted apart before, the symptom was a
 * byline on the site belonging to nobody on the masthead.
 *
 * These are real, named people. Two rules follow from that and are not style
 * preferences:
 *
 *   - A bio states only what the person told us they do. No invented
 *     experience, no credentials, no history. An honest bio is the whole
 *     reason /editorial-policy can be read as true.
 *   - A name only ever appears on work produced under the process that name
 *     signed up to. Re-bylining old articles onto a real person who was not
 *     involved is the one thing this file exists to prevent.
 */

export interface HouseByline {
  slug: string;
  name: string;
  /** Roles exactly as given by the person. Rendered under the name. */
  roles: string[];
  bio: string;
  /** Categories this byline may be used for. Empty means rotation only. */
  focus: string[];
}

const DISCLOSURE =
  'Articles under this byline are drafted with AI assistance and checked against ' +
  'their sources before they are published.';

/**
 * Categories with a standing byline.
 *
 * Everything not listed here rotates among the authors whose focus covers it,
 * so no single name accumulates every section by default.
 */
export const FIXED_BYLINES: Record<string, string> = {
  tech: 'ankur-singh',
  windows: 'ankur-singh',
  money: 'ankur-singh',
  travel: 'ankur-singh',
  gaming: 'adarsh-singh',
  entertainment: 'anushka-kumari',
};

/** Sections with no standing byline — these flip between authors. */
export const ROTATING_CATEGORIES = ['sports', 'health', 'education'];

export const HOUSE_BYLINES: HouseByline[] = [
  {
    slug: 'ankur-singh',
    name: 'Ankur Singh',
    roles: ['Founder', 'Editor', 'Software engineer', 'Writer'],
    bio:
      'Ankur Singh founded Favo News and edits it. He is a software engineer, and writes ' +
      `here on technology, money and travel, and on the thinking behind them. ${DISCLOSURE} ` +
      'He is responsible for everything that appears under this byline.',
    focus: ['tech', 'windows', 'money', 'travel'],
  },
  {
    slug: 'kiran-varma',
    name: 'Kiran Varma',
    roles: ['Founder', 'Editor', 'Mentor', 'Consultant'],
    bio:
      'Kiran Varma co-founded Favo News and helps run it, and works as a mentor and ' +
      `consultant. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'adarsh-singh',
    name: 'Adarsh Singh',
    roles: ['Software engineer', 'Project manager', 'Gamer'],
    bio:
      'Adarsh Singh is a software engineer and project manager. He covers games and the ' +
      `hardware they run on. ${DISCLOSURE}`,
    focus: ['gaming'],
  },
  {
    slug: 'anushka-kumari',
    name: 'Anushka Kumari',
    roles: ['Writer', 'Consultant', 'Finance', 'Art'],
    bio:
      'Anushka Kumari writes on entertainment and the arts, and works in finance as a ' +
      `consultant. ${DISCLOSURE}`,
    focus: ['entertainment'],
  },
  {
    slug: 'aakash-sharma',
    name: 'Aakash Sharma',
    roles: ['CEO at CodersHive', 'Traveller'],
    bio:
      'Aakash Sharma is the CEO of CodersHive. He travels, and writes about where he has ' +
      `been. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'kirti-sisodiya',
    name: 'Kirti Sisodiya',
    roles: ['Writer', 'Accountant'],
    bio: `Kirti Sisodiya writes for Favo News and works as an accountant. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'sushil-kumar-bharti',
    name: 'Sushil Kumar Bharti',
    roles: ['Writer'],
    bio: `Sushil Kumar Bharti writes for Favo News. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'diksha-ganglani',
    name: 'Diksha Ganglani',
    roles: ['Writer'],
    bio: `Diksha Ganglani writes for Favo News. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
];

export const HOUSE_SLUGS = HOUSE_BYLINES.map((author) => author.slug);

/** The standing byline for a category, or null when it rotates. */
export function fixedBylineFor(categorySlug: string): string | null {
  return FIXED_BYLINES[categorySlug] ?? null;
}
