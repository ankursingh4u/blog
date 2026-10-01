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
 * the same sentence turned the masthead into a wall of text nobody would read -
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
  /** One line. Kept short on purpose, see the note at the top of this file. */
  bio: string;
  /**
   * The full biography, for that person's own page.
   *
   * Written individually. Eight identical paragraphs saying "is a real person
   * answerable for what appears here" is boilerplate, and boilerplate is what a
   * reader skips, so the one page about a person said nothing about them.
   *
   * Evocative is fine. Invented is not: every line here is drawn from what the
   * person said they do, and nothing claims an achievement, a history or a
   * place that nobody has told us about.
   */
  biography: string;
  /**
   * A single line that carries the page, set above the biography.
   *
   * Deliberately not a quotation. Formatting a characterisation as something
   * the person said would be putting words in a real mouth; this is the site
   * describing them, and it is set so it reads that way.
   */
  strapline?: string;
  /** Categories this byline may be used for. Empty means rotation only. */
  focus: string[];
  /**
   * Things this person makes or runs, elsewhere.
   *
   * Listed only where the person has given them. A news byline that also builds
   * things is a disclosure as much as a credit, a reader who meets an article
   * about software should be able to see what its author ships.
   */
  links?: Array<{ label: string; href: string; note?: string }>;
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

/** Sections with no standing byline, these flip between authors. */
export const ROTATING_CATEGORIES = ['sports', 'health', 'education'];

export const HOUSE_BYLINES: HouseByline[] = [
  {
    slug: 'ankur-singh',
    name: 'Ankur Singh',
    roles: ['Founder', 'Editor', 'Software engineer', 'Writer'],
    interests: ['Philosophy', 'Writing', 'Building things'],
    bio: 'Built Favo News and runs it, solo. Software engineer; writes on tech, money and travel.',
    strapline: 'Built it alone. Still building.',
    biography:
      'Ankur Singh built Favo News and runs it, all of it, alone: the pipeline that finds the ' +
      'stories, the checks that stop the bad ones, and the site you are reading this on. An ' +
      'engineer first, and the habit an engineer builds, of opening a system up until it ' +
      'admits how it actually works, turns out to be the same habit a decent article needs. ' +
      'Philosophy is the other half of the shelf, and not for decoration: under most technology ' +
      'stories sits an older question about what we hand over and what we keep. The building ' +
      'has not stopped, and the list is not short: SEO4AI, PalmInsights on the Play Store, ' +
      'Demand Radar on Shopify. Which is the useful disclosure here, because the technology ' +
      'covered on this site is covered by someone who ships it.',
    focus: ['tech', 'windows', 'money', 'travel'],
    links: [
      { label: 'ankursingh.site', href: 'https://ankursingh.site', note: 'Personal site' },
      { label: 'SEO4AI', href: 'https://seo4ai.app', note: 'seo4ai.app' },
      { label: 'PalmInsights', href: 'https://palminsights.xyz', note: 'palminsights.xyz' },
      {
        label: 'PalmInsights on Google Play',
        href: 'https://play.google.com/store/apps/details?id=live.bolddev.palminsight',
        note: 'Android app',
      },
      {
        label: 'Demand Radar',
        href: 'https://apps.shopify.com/demandradar',
        note: 'Shopify app',
      },
    ],
  },
  {
    slug: 'kiran-varma',
    name: 'Kiran Varma',
    roles: ['Founder', 'Editor', 'Mentor', 'Consultant'],
    interests: ['Trying new things', 'Technology', 'Travel'],
    bio: 'Co-founded Favo News. Mentor and consultant, and a reliable asker of harder questions.',
    biography:
      'Kiran Varma co-founded Favo News and helps steer what it turns into. Mentoring and ' +
      'consulting come down, stripped of the job titles, to asking the question someone has ' +
      'been walking around for weeks, which is the same question a good editor puts to a ' +
      'draft. Curious to a fault about anything new enough to be worth the trouble: a tool, a ' +
      'technology, a country. Whatever survives that curiosity tends to end up on this site.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'aakash-sharma',
    name: 'Aakash Sharma',
    roles: ['Founder', 'CEO at CodersHive', 'Mentor', 'Traveller'],
    interests: ['Travel', 'Animals', 'Mentoring'],
    bio: 'Founder and CEO of CodersHive. Mentor, traveller, pet lover.',
    strapline: 'Still expanding, which is the part most founder stories leave out.',
    biography:
      'Aakash Sharma founded CodersHive and runs it, and has never been especially taken with ' +
      'the safe version of a plan. The company is still expanding, which is the stretch most ' +
      'founder stories skip over: the long middle where you keep placing bets after the first ' +
      'one has already come good. Mentors people a few steps back on the same road, on the ' +
      'theory that the useful advice is the kind that costs the giver something. Travels ' +
      'whenever the calendar gives way and writes about what the trip actually cost rather ' +
      'than the postcard version, and is reliably the person in the room who wants to meet ' +
      'the dog first.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'adarsh-singh',
    name: 'Adarsh Singh',
    roles: ['Software engineer', 'Project manager', 'Gamer'],
    interests: ['Gaming', 'PC hardware'],
    bio: 'Software engineer and project manager. Ships software by day, plays it by night.',
    biography:
      'Adarsh Singh builds software for a living and plays it for pleasure, which makes for a ' +
      'sharp eye on the distance between a patch note and an actual patch. Covers games, the ' +
      'hardware they lean on, and the quiet updates that change how a thing feels in the hand ' +
      'without ever making the headline.',
    focus: ['gaming'],
  },
  {
    slug: 'sushil-kumar-bharti',
    name: 'Sushil Kumar Bharti',
    roles: ['Software engineer', 'Problem solver', 'Writer'],
    interests: ['The gym', 'Learning new things'],
    bio: 'Software engineer and writer. Takes a thing apart, then explains it plainly.',
    biography:
      'Sushil Kumar Bharti is an engineer who writes, or a writer who debugs; the order has ' +
      'never much mattered. Both jobs reduce to the same move, open it up, find the part ' +
      'doing the actual work, then say plainly what it does. Learning something unrelated is ' +
      'the default setting, and the gym is where most of the thinking gets done.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'kirti-sisodiya',
    name: 'Kirti Sisodiya',
    roles: ['Writer', 'Author', 'Accountant'],
    interests: ['Cooking', 'The gym', 'Reading'],
    bio: 'Writer and accountant. Notices the number that does not add up.',
    biography:
      'Kirti Sisodiya writes and keeps the books, which makes for an unusually hard reader of ' +
      'other people’s numbers. A figure that refuses to reconcile is not a detail to be ' +
      'smoothed over here; more often it is the story. Away from the desk: a kitchen, a ' +
      'barbell, and a reading list that comfortably outpaces the hours available to it.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'diksha-ganglani',
    name: 'Diksha Ganglani',
    roles: ['Writer', 'Author', 'Team lead'],
    interests: ['Leading teams', 'Meeting people', 'Style'],
    bio: 'Writer and team lead. Usually knows everyone in the room already.',
    biography:
      'Diksha Ganglani writes and leads, and the second explains the first: running a team ' +
      'teaches you quickly that clarity is a form of kindness. Walks into a room and leaves ' +
      'it knowing everyone in it. Has a good eye for how a thing is put together, whether ' +
      'that thing is a sentence or an outfit.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'anushka-kumari',
    name: 'Anushka Kumari',
    roles: ['Writer', 'Author', 'Finance', 'Consultant'],
    interests: ['Art'],
    bio: 'Writes on entertainment and the arts, and consults in finance.',
    biography:
      'Anushka Kumari writes about what people make, and advises on what pays for it. ' +
      'Entertainment and the arts on one side of the desk, finance on the other, less two ' +
      'careers than one subject approached from both ends, because money is rarely silent ' +
      'about what gets made and who gets to make it. Comes to a film the way one comes to a ' +
      'balance sheet: interested, above all, in what it is not saying.',
    focus: ['entertainment'],
  },
  {
    slug: 'jatin-prajapati',
    name: 'Jatin Prajapati',
    roles: ['Founder', 'Writer', 'Author'],
    interests: [],
    bio: 'Founder of Rdranex. Writer and author.',
    biography:
      'Jatin Prajapati founded Rdranex and writes, which are closer to the same activity than ' +
      'either job title suggests: both start with deciding what is worth other people’s ' +
      'attention, and both are mostly the work of cutting what is not. Writes across the ' +
      'sections of Favo News that rotate between us.',
    focus: ['sports', 'health', 'education'],
    links: [{ label: 'Rdranex', href: 'https://rdranex.in', note: 'rdranex.in' }],
  },
  {
    slug: 'aditi-jain',
    name: 'Aditi Jain',
    roles: ['Writer', 'Author', 'Team lead'],
    interests: [],
    bio: 'Writer and team lead. Keeps a room pointed in the same direction.',
    biography:
      'Aditi Jain writes and leads, and leading is what sharpened the writing: a team that ' +
      'half-understands you does the wrong work, cheerfully, for a week. Clarity stopped being ' +
      'a style preference somewhere around the second time that happened. Writes across the ' +
      'sections of Favo News that rotate between us.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'ankit-mishra',
    name: 'Ankit Mishra',
    roles: ['Data analyst', 'Writer'],
    interests: [],
    bio: 'Data analyst and writer. Asks what the number is actually counting.',
    biography:
      'Ankit Mishra works in data analytics and writes, which turn out to be the same instinct ' +
      'pointed at different things: find the figure doing the real work, check what it is ' +
      'actually counting, then say plainly what it shows. A chart can mislead more ' +
      'efficiently than a sentence, which is a useful thing for a newsroom to have someone ' +
      'thinking about. Writes across the sections that rotate.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'irfan-siddique',
    name: 'Irfan Siddique',
    roles: ['Software engineer', 'Problem solver', 'Writer'],
    interests: [],
    bio: 'Software engineer and writer. Finds the part that is actually broken.',
    biography:
      'Irfan Siddique is an engineer who writes. Debugging teaches a particular kind of ' +
      'patience: the problem is rarely where the noise is, and the fix is rarely the first ' +
      'thing that stops the error. The same patience applied to a story means the obvious ' +
      'explanation gets checked before it gets printed. Writes across the sections that rotate.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'ratana-prajapati',
    name: 'Ratana Prajapati',
    roles: ['Data analyst', 'Writer'],
    interests: [],
    bio: 'Data analyst and writer. Reads a dataset for what it leaves out.',
    biography:
      'Ratana Prajapati works in data analytics and writes. Most of the useful work in both ' +
      'is subtraction: which rows were dropped, which period was chosen, what the average is ' +
      'hiding. A number that arrives without its method is an opinion wearing a suit. Writes ' +
      'across the sections that rotate.',
    focus: ['sports', 'health', 'education'],
  },
  {
    slug: 'raushan-kumar',
    name: 'Raushan Kumar',
    roles: ['Writer', 'Author', 'Thinker'],
    interests: [],
    bio: 'Writer. Reads the argument underneath the news.',
    biography:
      'Raushan Kumar writes, and is the person on this masthead most likely to find the ' +
      'question nobody in the room had thought to ask. Under most news stories sits an older ' +
      'argument about what we hand over and what we keep, and that argument is usually the ' +
      'more interesting half. Quick enough to get to it before the story has finished ' +
      'happening. Writes across the sections that rotate.',
    focus: ['sports', 'health', 'education'],
  },
];

export const HOUSE_SLUGS = HOUSE_BYLINES.map((author) => author.slug);

/** The standing byline for a category, or null when it rotates. */
export function fixedBylineFor(categorySlug: string): string | null {
  return FIXED_BYLINES[categorySlug] ?? null;
}
