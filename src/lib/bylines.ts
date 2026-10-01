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
  /**
   * What they do outside the job, where they have told us.
   *
   * Empty where nobody has said. It stays empty until they do: a hobby is the
   * easiest thing in a bio to make up and the easiest for a reader to catch.
   */
  interests: string[];
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
    roles: ['Founder', 'Editor', 'Software engineer', 'Writer', 'Thinker'],
    interests: ['Philosophy', 'Writing', 'Building things'],
    bio:
      'Ankur Singh founded Favo News and edits it. A software engineer by trade and a reader ' +
      'of philosophy by habit, and the two meet in how this site reads: what a thing does ' +
      'first, then what it changes for the people using it. Writes here on technology, money ' +
      `and travel, and is accountable for everything published under this byline. ${DISCLOSURE}`,
    focus: ['tech', 'windows', 'money', 'travel'],
  },
  {
    slug: 'kiran-varma',
    name: 'Kiran Varma',
    roles: ['Founder', 'Editor', 'Mentor', 'Consultant'],
    interests: [],
    bio:
      'Kiran Varma co-founded Favo News and helps run it. Works as a mentor and consultant, ' +
      'which is largely the business of asking better questions than the ones people arrive ' +
      `with — the same instinct that decides what is worth publishing here. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'adarsh-singh',
    name: 'Adarsh Singh',
    roles: ['Software engineer', 'Project manager', 'Gamer'],
    interests: ['Gaming', 'PC hardware'],
    bio:
      'Adarsh Singh is a software engineer and project manager who ships software during the ' +
      'day and plays it at night. Covers games, the hardware they run on, and the patches ' +
      `that quietly change both. ${DISCLOSURE}`,
    focus: ['gaming'],
  },
  {
    slug: 'anushka-kumari',
    name: 'Anushka Kumari',
    roles: ['Writer', 'Author', 'Finance', 'Consultant'],
    interests: ['Art'],
    bio:
      'Anushka Kumari writes on entertainment and the arts, and consults in finance. The two ' +
      'halves explain each other more often than you would think: who pays for a thing tends ' +
      `to shape what it ends up saying. ${DISCLOSURE}`,
    focus: ['entertainment'],
  },
  {
    slug: 'aakash-sharma',
    name: 'Aakash Sharma',
    roles: ['CEO at CodersHive', 'Traveller'],
    interests: ['Travel'],
    bio:
      'Aakash Sharma is the CEO of CodersHive and a traveller with a longer list of places ' +
      'still to see than ones already seen. Writes about the going, the getting there, and ' +
      `what it actually cost. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'kirti-sisodiya',
    name: 'Kirti Sisodiya',
    roles: ['Writer', 'Author', 'Accountant'],
    interests: [],
    bio:
      'Kirti Sisodiya writes, and keeps the books. An accountant notices the number that does ' +
      'not add up, which turns out to be a useful habit to bring to a newsroom that publishes ' +
      `figures. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'sushil-kumar-bharti',
    name: 'Sushil Kumar Bharti',
    roles: ['Writer', 'Author'],
    interests: [],
    bio:
      'Sushil Kumar Bharti is a writer and author, and writes across the sections of Favo News ' +
      `that rotate between us — sport, health and education. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'diksha-ganglani',
    name: 'Diksha Ganglani',
    roles: ['Writer', 'Author'],
    interests: [],
    bio:
      'Diksha Ganglani is a writer and author, and writes across the sections of Favo News ' +
      `that rotate between us — sport, health and education. ${DISCLOSURE}`,
    focus: ['sports', 'health', 'education'],
  },
];

export const HOUSE_SLUGS = HOUSE_BYLINES.map((author) => author.slug);

/** The standing byline for a category, or null when it rotates. */
export function fixedBylineFor(categorySlug: string): string | null {
  return FIXED_BYLINES[categorySlug] ?? null;
}
