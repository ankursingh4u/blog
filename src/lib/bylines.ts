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
 *
 * The AI disclosure is NOT repeated in each bio. It was, and eight copies of
 * the same sentence turned the masthead into a wall of text nobody would read —
 * including the disclosure itself. It is stated once in the section heading
 * above the cards, where a reader actually takes it in, and in full on
 * /editorial-policy.
 *
 * Bios are one line each. A masthead is a list of people, not eight paragraphs.
 * Array order is display order, set by the owner.
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
  /** One line. Kept short on purpose — see the note at the top of this file. */
  bio: string;
  /** Categories this byline may be used for. Empty means rotation only. */
  focus: string[];
}

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
    interests: ['Philosophy', 'Writing', 'Building things'],
    bio: 'Founded Favo News and edits it. Software engineer; writes on tech, money and travel.',
    focus: ['tech', 'windows', 'money', 'travel'],
  },
  {
    slug: 'kiran-varma',
    name: 'Kiran Varma',
    roles: ['Founder', 'Editor', 'Mentor', 'Consultant'],
    interests: ['Trying new things', 'Technology', 'Travel'],
    bio: 'Co-founded Favo News. Mentor and consultant, and a reliable asker of harder questions.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'aakash-sharma',
    name: 'Aakash Sharma',
    roles: ['CEO at CodersHive', 'Traveller'],
    interests: ['Travel'],
    bio: 'CEO at CodersHive. Travels, and writes about what it actually cost.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'adarsh-singh',
    name: 'Adarsh Singh',
    roles: ['Software engineer', 'Project manager', 'Gamer'],
    interests: ['Gaming', 'PC hardware'],
    bio: 'Software engineer and project manager. Ships software by day, plays it by night.',
    focus: ['gaming'],
  },
  {
    slug: 'sushil-kumar-bharti',
    name: 'Sushil Kumar Bharti',
    roles: ['Software engineer', 'Problem solver', 'Writer'],
    interests: ['The gym', 'Learning new things'],
    bio: 'Software engineer and writer. Takes a thing apart, then explains it plainly.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'kirti-sisodiya',
    name: 'Kirti Sisodiya',
    roles: ['Writer', 'Author', 'Accountant'],
    interests: ['Cooking', 'The gym', 'Reading'],
    bio: 'Writer and accountant. Notices the number that does not add up.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'diksha-ganglani',
    name: 'Diksha Ganglani',
    roles: ['Writer', 'Author', 'Team lead'],
    interests: ['Leading teams', 'Meeting people', 'Style'],
    bio: 'Writer and team lead. Usually knows everyone in the room already.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'anushka-kumari',
    name: 'Anushka Kumari',
    roles: ['Writer', 'Author', 'Finance', 'Consultant'],
    interests: ['Art'],
    bio: 'Writes on entertainment and the arts, and consults in finance.',
    focus: ['entertainment'],
  },
];

export const HOUSE_SLUGS = HOUSE_BYLINES.map((author) => author.slug);

/** The standing byline for a category, or null when it rotates. */
export function fixedBylineFor(categorySlug: string): string | null {
  return FIXED_BYLINES[categorySlug] ?? null;
}
