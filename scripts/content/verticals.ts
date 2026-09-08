/**
 * Development content fixtures for the eight broad verticals.
 *
 * Same rules as scripts/content/articles.ts: hand-written, not pipeline output,
 * and meant to be deleted from /admin before launch.
 *
 * These are deliberately **evergreen explainers** rather than dated news. A
 * fixture cannot cite a scoreline, a release date or a study result without
 * inventing it, and inventing facts is the one thing this project does not do.
 * Everything below is the kind of piece that stays true, so the templates,
 * listings and search can be exercised honestly.
 *
 * Every URL in `sources` was checked to resolve before being added — see
 * scripts/check-sources.ts.
 */
import type { ArticleFixture } from './articles';

const WHO_ACTIVITY = {
  url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  title: 'Physical activity — World Health Organization',
};
const NHS_SLEEP = {
  url: 'https://www.nhs.uk/live-well/sleep-and-tiredness/',
  title: 'Sleep and tiredness — NHS',
};
const NHS_LIVEWELL = {
  url: 'https://www.nhs.uk/live-well/',
  title: 'Live Well — NHS',
};
const BOE_RATE = {
  url: 'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate',
  title: 'The interest rate (Bank Rate) — Bank of England',
};
const FED_POLICY = {
  url: 'https://www.federalreserve.gov/monetarypolicy.htm',
  title: 'Monetary Policy — Federal Reserve',
};
const GOV_UK_EDUCATION = {
  url: 'https://www.gov.uk/browse/education',
  title: 'Education and learning — GOV.UK',
};
const PREMIER_LEAGUE = {
  url: 'https://www.premierleague.com/',
  title: 'Premier League — official site',
};
const FIFA = {
  url: 'https://www.fifa.com/',
  title: 'FIFA — official site',
};

export const VERTICAL_ARTICLES: ArticleFixture[] = [
  /* ------------------------------------------------------------------ tech */
  {
    slug: 'how-much-ram-do-you-actually-need',
    title: 'How much RAM do you actually need?',
    categorySlug: 'tech',
    authorSlug: 'iris-vale',
    daysAgo: 1,
    testedOnBuild: null,
    qualityScore: 89,
    affectedBuilds: [],
    metaTitle: 'How much RAM do you actually need?',
    metaDescription:
      '8GB, 16GB or 32GB? What each tier genuinely handles, how to check what you are using now, and when more RAM changes nothing.',
    quickAnswer:
      '16GB is the sensible default for most people in 2026. 8GB still works for browsing and office work but leaves no headroom; 32GB only pays off for video editing, large datasets, virtual machines or heavy multitasking. Check your actual usage before buying — if you never exceed 60% you will feel no benefit from more.',
    body: `RAM is the most oversold component in a computer. Shops push it because it is
cheap to add and easy to describe, and the result is a lot of people paying for
memory they will never touch.

The honest answer is that RAM only helps until you stop running out of it. Past
that point, extra capacity does nothing at all.

## Check what you use before you buy anything

This takes two minutes and settles the question.

1. Press \`Ctrl + Shift + Esc\` to open **Task Manager**.
2. Go to the **Performance** tab and select **Memory**.
3. Now use the machine normally for a while — open everything you would on a
   busy day.
4. Watch the **In use** figure and the percentage.

If you peak below about 60%, more RAM will not make anything faster. If you are
regularly above 85%, or the **Committed** figure exceeds your physical memory,
you are short and an upgrade is the single best thing you can buy.

## What each tier actually handles

**8GB** — Browsing, email, streaming, office documents. It works, but it is
tight. A browser with 30 tabs plus a video call will start swapping to disk, and
that is where the "my laptop got slow" feeling comes from. Fine for a secondary
machine, thin for a main one.

**16GB** — The default recommendation. Comfortable for heavy browsing, office
work, photo editing, most games, and light development. This is where the price
per gigabyte is best and where most people should land.

**32GB** — Genuinely useful for 4K video editing, running virtual machines,
large spreadsheets and datasets, or compiling big projects. If none of those
describe you, it is money spent on a number in a spec sheet.

**64GB and beyond** — Professional workloads. If you need it, you already know
why.

## Speed and channels matter more than people think

Two things affect real performance as much as raw capacity:

- **Dual channel.** Two sticks of 8GB beat one stick of 16GB, sometimes by a
  wide margin, because the memory controller can talk to both at once. This
  matters most on laptops and on systems using integrated graphics, where the
  GPU shares system memory.
- **Speed and latency.** Faster memory helps, but the gains are modest compared
  with going from "not enough" to "enough". Buy capacity first, speed second.

If you are adding a stick to an existing machine, match the existing one as
closely as you can. Mismatched pairs usually run at the slower stick's speed.

## When more RAM will not help

Be clear about what memory does not fix:

- **A slow hard drive.** If the machine still has a mechanical drive, an SSD is a
  far bigger upgrade than any amount of RAM.
- **An old or weak processor.** RAM does not make a CPU faster.
- **Games limited by the graphics card.** Frame rates are usually GPU-bound.
- **A machine full of background software.** Free memory by removing startup
  programs before spending money.

## Can you even upgrade it?

Check before you plan anything. Many thin laptops — and every Apple silicon Mac
— have memory soldered to the board, which means the amount you buy on day one
is the amount you have forever. On those machines the decision happens at
purchase and cannot be revisited.

Desktops are almost always upgradeable. Look up your motherboard model for the
maximum supported capacity and the number of slots.`,
    faq: [
      {
        question: 'Is 8GB of RAM still enough?',
        answer:
          'For browsing, email, streaming and office documents, yes. It becomes limiting with many browser tabs open alongside video calls or photo editing. For a machine you will keep several years, 16GB is the safer buy.',
      },
      {
        question: 'Will more RAM make my computer faster?',
        answer:
          'Only if you are currently running out. Going from not enough to enough is a dramatic improvement; going from enough to more changes nothing measurable.',
      },
      {
        question: 'Is it better to have two sticks or one?',
        answer:
          'Two, in almost all cases. Dual-channel lets the memory controller use both simultaneously, and the difference is especially noticeable on systems using integrated graphics.',
      },
      {
        question: 'Can I mix different RAM sizes and speeds?',
        answer:
          'Usually it will work, but the system typically runs everything at the slowest stick’s speed and may drop out of dual-channel. Matching sticks is worth the small extra effort.',
      },
    ],
    sources: [],
  },

  {
    slug: 'phone-battery-health-when-to-replace',
    title: 'Phone battery health: when it actually needs replacing',
    categorySlug: 'tech',
    authorSlug: 'maya-orsini',
    daysAgo: 4,
    testedOnBuild: null,
    qualityScore: 88,
    affectedBuilds: [],
    metaTitle: 'Phone battery health: when to replace it',
    metaDescription:
      'How to check your phone battery health, what the percentage really means, and the point at which replacing the battery beats replacing the phone.',
    quickAnswer:
      'Check battery health in your phone settings. Below roughly 80% of original capacity you will notice shorter days and possible slowdowns, and a replacement battery — far cheaper than a new phone — usually restores normal behaviour. Sudden shutdowns or visible swelling mean replace it now.',
    body: `Phone batteries wear out. This is chemistry, not a defect, and not a conspiracy
to sell you a new handset. What matters is knowing when wear has crossed from
"normal" into "worth fixing".

## How to check your battery health

**iPhone:** Settings > Battery > Battery Health & Charging. You will see
**Maximum Capacity** as a percentage of the original.

**Android:** varies by manufacturer. Samsung devices report it under Settings >
Battery and device care > Diagnostics; recent Android versions expose battery
health in Settings > Battery. If yours does not show it, the manufacturer's own
diagnostics app usually will.

## What the number means

Capacity is measured against the battery when new.

- **100–90%** — Effectively new. Nothing to do.
- **89–80%** — Normal wear. You will notice the day getting shorter, especially
  in cold weather. Still perfectly usable.
- **Below 80%** — This is the conventional threshold where manufacturers
  consider a battery consumed. Expect noticeably shorter runtime, and on some
  phones, deliberate performance limits to prevent shutdowns.
- **Below 70%** — Replace it. You are living with a significantly degraded
  device for no reason.

Most batteries reach 80% somewhere around 500 to 1,000 full charge cycles, which
for typical use is roughly two to three years.

## Replace the battery before you replace the phone

This is the part worth internalising. A battery replacement costs a fraction of
a new phone. If the handset is otherwise fine — screen intact, still receiving
software updates, performance acceptable — a new battery buys years for a small
fraction of the price of replacing it.

Consider a new phone instead when:

- It no longer receives security updates.
- The screen or body is already damaged.
- It is slow at things you need it to do, beyond battery-related throttling.

## Signs you should act immediately

Do not wait on any of these:

- **The phone shuts down suddenly** at 20% or 30% remaining. The battery can no
  longer deliver peak current.
- **Visible swelling.** A back panel lifting away from the frame, or a screen
  bulging at an edge, means the cell is expanding. Stop using it, do not charge
  it, and take it to a repair shop. This is a genuine fire risk.
- **The phone gets hot doing nothing.**

## What actually extends battery life

The advice that holds up:

- **Avoid extremes of heat.** Heat is the single biggest killer of lithium-ion
  cells. Do not leave a phone on a car dashboard or charging under a pillow.
- **Avoid habitually sitting at 100%.** Most modern phones have an optimised or
  limited charging setting that holds at 80% until you need the rest — turn it
  on.
- **Do not obsess over full discharges.** Deep discharges to 0% are harder on a
  lithium cell than partial top-ups. Charging little and often is fine.

Ignore advice about "calibrating" a battery by fully draining it. That applied
to older battery chemistry and does nothing useful today.`,
    faq: [
      {
        question: 'At what battery health percentage should I replace it?',
        answer:
          'Around 80% is the widely used threshold where wear becomes noticeable. Below 70%, a replacement is clearly worthwhile if the phone is otherwise in good condition.',
      },
      {
        question: 'Does fast charging damage the battery?',
        answer:
          'Modern phones manage charging speed and temperature to limit wear, and normal use of the bundled charger is fine. Heat is the real problem, so avoid fast charging in hot conditions or under bedding.',
      },
      {
        question: 'Should I let my phone go to 0% before charging?',
        answer:
          'No. Deep discharges stress lithium-ion cells more than partial charges. Topping up whenever convenient is better for longevity.',
      },
      {
        question: 'My phone is swollen. Is that dangerous?',
        answer:
          'Yes. A swelling battery is a fire risk. Stop charging and using the device and take it to a repair shop. Never try to puncture or pry out a swollen cell yourself.',
      },
    ],
    sources: [],
  },

  {
    slug: 'what-a-vpn-does-and-does-not-do',
    title: 'What a VPN actually does — and what it does not',
    categorySlug: 'tech',
    authorSlug: 'iris-vale',
    daysAgo: 9,
    testedOnBuild: null,
    qualityScore: 87,
    affectedBuilds: [],
    metaTitle: 'What a VPN actually does (and does not do)',
    metaDescription:
      'VPN marketing promises anonymity and total security. Here is what the technology genuinely provides, and the claims that do not hold up.',
    quickAnswer:
      'A VPN encrypts traffic between your device and the VPN server and hides your IP address from the sites you visit. It does not make you anonymous, does not stop tracking by accounts you are logged into, and does not protect you from malware or phishing. It moves trust from your network provider to the VPN provider.',
    body: `VPN advertising is some of the most misleading marketing in consumer
technology. The technology is genuinely useful for a few specific things and
useless for most of what it is sold on.

## What it genuinely does

**Encrypts traffic between you and the VPN server.** Anyone watching the local
network — a café's Wi-Fi, a hotel connection, your internet provider — sees an
encrypted tunnel rather than which sites you visited.

**Hides your IP address from sites you visit.** They see the VPN server's
address instead, which also means they infer its location rather than yours.

**Lets you appear to be somewhere else.** This is why VPNs are used for
region-locked streaming catalogues and services unavailable in a country.

**Bypasses some network-level blocking.** If a network blocks sites by address
or DNS, a VPN routes around it.

That list is worth paying for if it matches your needs. What follows is not.

## What it does not do

**It does not make you anonymous.** The moment you sign into any account, you
have identified yourself regardless of the tunnel. Browser fingerprinting,
cookies and logged-in sessions all continue to work exactly as before.

**It does not stop tracking by companies you use.** A VPN changes nothing about
what a social network or search engine knows about you once you are signed in.

**It does not protect you from malware or phishing.** Encrypted delivery of a
malicious file is still delivery of a malicious file. Some providers bundle
blocklists, but that is an add-on, not the VPN.

**It does not secure a site that lacks HTTPS end-to-end.** It protects the leg
between you and the VPN server. Beyond that, ordinary web security applies —
and almost all traffic is already encrypted by HTTPS anyway, which is the part
most VPN advertising quietly omits.

**It does not make you untraceable to law enforcement.** Providers can be
compelled, and logging claims are largely unverifiable from outside.

## The trust question

This is the part that matters most, and it is rarely mentioned.

Without a VPN, your internet provider can see which sites you connect to. With
one, they cannot — but the **VPN provider** can. You have not eliminated the
observer; you have chosen a different one.

That makes the provider's honesty the entire security model. Ask:

- Where is the company based, and under which legal regime?
- Has its no-logging claim been independently audited, and is the audit public?
- How is it funded? A free VPN has to make money somehow, and the usual answer
  is selling data — which is precisely what you were trying to avoid.

## When a VPN is genuinely worth it

- On untrusted networks, if you handle sensitive material.
- To access your home or work network remotely — the original purpose.
- To reach region-restricted content, within the terms you have agreed to.
- Where an internet provider or government blocks access to information.

## When it is not

- "For security" on your own home network, where it adds little over HTTPS.
- To stop advertisers tracking you. Browser settings, blockers and signing out
  do far more.
- Because a sponsored video said your data was at risk. Check whether the
  specific claim survives the list above.`,
    faq: [
      {
        question: 'Does a VPN make me anonymous online?',
        answer:
          'No. It hides your IP address from the sites you visit, but any account you sign into identifies you, and browser fingerprinting still works. Anonymity requires far more than a VPN.',
      },
      {
        question: 'Are free VPNs safe?',
        answer:
          'Treat them with suspicion. Running a VPN service costs real money, so a free provider is monetising something — commonly the data you were trying to protect. If you need one, pay for it.',
      },
      {
        question: 'Does a VPN slow down my connection?',
        answer:
          'Usually yes, at least slightly. Traffic takes a longer path and is encrypted and decrypted along the way. A good provider with a nearby server makes the difference small.',
      },
      {
        question: 'Do I need a VPN on public Wi-Fi?',
        answer:
          'Less than the marketing suggests, because nearly all web traffic is already encrypted with HTTPS. It still adds a layer if you handle sensitive material on networks you do not trust.',
      },
    ],
    sources: [],
  },

  /* --------------------------------------------------------- entertainment */
  {
    slug: 'why-shows-disappear-from-streaming-services',
    title: 'Why shows and films disappear from streaming services',
    categorySlug: 'entertainment',
    authorSlug: 'nadia-fenn',
    daysAgo: 2,
    testedOnBuild: null,
    qualityScore: 88,
    affectedBuilds: [],
    metaTitle: 'Why shows disappear from streaming services',
    metaDescription:
      'Licences expire, tax rules change and catalogues get pruned. The real reasons titles vanish, and what you can do about it.',
    quickAnswer:
      'Most titles are licensed for a fixed term, not owned, so they leave when the deal ends and the rights return to whoever owns them. Streamers also remove their own originals for tax and cost reasons. Nothing you have "bought" on a streaming subscription is actually yours.',
    body: `You add something to a list, come back a month later, and it is gone. This
happens for reasons that have nothing to do with popularity.

## Reason 1: The licence expired

Most of what you watch on a streaming service is not owned by that service. It is
**licensed** for a defined window — often two or three years — for a defined set
of countries.

When the window closes, one of three things happens:

- The deal is renewed and the title stays.
- The rights holder wants more than the streamer will pay, and it leaves.
- The rights holder launches its own service and takes the title back.

That third case reshaped the industry. Studios that once licensed their libraries
to whoever paid now keep the good material for their own platforms.

## Reason 2: The streamer removed its own title deliberately

More recent, and more surprising to viewers: services remove shows they produced
themselves.

The reasons are financial. Keeping a title available incurs ongoing residual
payments to cast and crew. Removing it can allow the company to write the
production down as a loss for tax purposes. If a show is not attracting enough
viewing to justify those costs, the accounting can favour deletion over
retention.

This is why a series can vanish entirely — not to another service, but from
availability altogether.

## Reason 3: Regional rights are sold separately

A title can be on a service in one country and absent in another, because rights
are negotiated territory by territory. The same show may sit with three different
distributors in three markets, each with its own end date.

This is also why catalogue sizes differ so much between countries.

## Reason 4: Music clearances

An underrated cause, particularly for older television. Music is licensed
separately from the rest of a production, often for a shorter term and sometimes
only for the original broadcast medium.

When a music licence cannot be renewed affordably, the choice is to replace the
track — which is why some reissued shows have different music from what you
remember — or to pull the episode.

## What you can actually do

**Check before you commit to a long series.** Several catalogue-tracking sites
list leaving dates, and some services flag "last day to watch" on the title page.

**Understand what "buy" means.** Purchasing a digital title from a storefront
grants a licence, not ownership. If the storefront loses the rights or shuts
down, access can end. Refunds are not guaranteed.

**Keep physical media for anything you truly care about.** A disc does not
expire, is not renegotiated, and does not depend on a company's continued
existence. For a handful of favourites, it remains the only durable option.

**Follow the rights holder, not the platform.** When a title leaves one service
it often reappears elsewhere within months, because the rights went somewhere.
The exception is a deliberate removal by its own producer, which may not return
at all.`,
    faq: [
      {
        question: 'Why do shows leave right when I start watching?',
        answer:
          'Coincidence plus scale — licences expire constantly across a large catalogue. Some services do promote titles heavily in their final weeks, which makes it feel targeted.',
      },
      {
        question: 'If I bought a film digitally, can it still disappear?',
        answer:
          'Yes. A digital purchase is a long-term licence, not ownership. If the storefront loses distribution rights or closes, access can end, and compensation is not guaranteed.',
      },
      {
        question: 'Do removed shows come back?',
        answer:
          'Often, elsewhere — the rights moved to another buyer. Titles deliberately removed by the service that made them are the ones least likely to return.',
      },
      {
        question: 'Why is a show available in one country but not another?',
        answer:
          'Streaming rights are sold territory by territory, with different distributors and different end dates in each market. Catalogues genuinely differ by country as a result.',
      },
    ],
    sources: [],
  },

  {
    slug: 'how-box-office-numbers-actually-work',
    title: 'How box office numbers actually work',
    categorySlug: 'entertainment',
    authorSlug: 'nadia-fenn',
    daysAgo: 6,
    testedOnBuild: null,
    qualityScore: 86,
    affectedBuilds: [],
    metaTitle: 'How box office numbers actually work',
    metaDescription:
      'A film can gross hundreds of millions and still lose money. What opening weekend, gross and break-even really mean.',
    quickAnswer:
      'Box office gross is ticket revenue, not profit. Cinemas keep roughly half, and marketing often costs as much as production, so the rough rule of thumb is that a film needs to gross around two and a half times its production budget to break even.',
    body: `Box office reporting is full of large numbers presented without the context
that makes them mean anything. Here is how to read them.

## Gross is not profit

The headline figure is **gross box office** — the total value of tickets sold.
Almost none of that reaches the studio.

Cinemas keep a share, typically around half over a film's run, and more in some
territories. The split usually favours the studio in the opening week and shifts
towards the cinema the longer a film stays, which is one reason studios push so
hard for a big opening.

## Marketing is the invisible budget

A reported production budget covers making the film. It excludes marketing, and
marketing is enormous — for a wide release it can approach or match the
production budget itself.

That spend is rarely announced, which is why outside estimates of profitability
are always approximate.

## The rough break-even rule

Combining the two above gives the industry's crude heuristic: a film needs to
gross roughly **two and a half times its production budget** to break even
theatrically.

So a film made for $200 million needs somewhere around $500 million worldwide
before it starts making money in cinemas. This is why films that gross "over
$400 million" are sometimes described as disappointments — the number sounds
enormous and is still short.

## Why opening weekend dominates coverage

Opening weekend gets disproportionate attention because it is genuinely
predictive. It is the point of maximum marketing effect and the moment cinemas
decide how many screens to keep giving a film.

The number to watch afterwards is the **second-weekend drop**. A fall of 40–50%
is normal for a blockbuster. A steeper drop suggests weak word of mouth. A shallow
drop — "legs" — means audiences are recommending it, and those films often finish
far above what their opening implied.

## Theatrical is not the whole picture

A film that loses money in cinemas can still end up profitable through streaming
licensing, digital rental and purchase, physical media, television rights and
international deals sold territory by territory.

This is why studios rarely confirm that a film lost money. The full accounting
runs for years and is not published.

## Reading the coverage sceptically

- **"Biggest opening ever"** — usually not adjusted for inflation or ticket-price
  rises, and often restricted to a narrow category.
- **"$1 billion worldwide"** — includes territories where the studio's share is
  much smaller.
- **Unnamed studio sources** — profitability leaks tend to serve someone's
  interests.
- **Budget figures** — frequently reported after tax credits and rebates, which
  can understate what was actually spent.`,
    faq: [
      {
        question: 'How much of a ticket does the studio keep?',
        answer:
          'Roughly half across a typical run, though the studio share is higher in the opening week and declines afterwards. It also varies significantly by country.',
      },
      {
        question: 'Why does a film grossing $400 million count as a flop?',
        answer:
          'Because gross is not profit. After the cinema share and marketing spend, a film generally needs around two and a half times its production budget to break even.',
      },
      {
        question: 'What is a normal second-weekend drop?',
        answer:
          'Around 40 to 50% for a big release. Much steeper suggests poor word of mouth; a shallower drop indicates strong audience recommendation and usually a much larger final total.',
      },
      {
        question: 'Do streaming films report box office?',
        answer:
          'Generally no. Services release viewing figures selectively and on their own definitions, which makes them difficult to compare between platforms or against box office.',
      },
    ],
    sources: [],
  },

  {
    slug: 'what-a-streaming-release-window-means',
    title: 'Release windows: when a film reaches streaming',
    categorySlug: 'entertainment',
    authorSlug: 'nadia-fenn',
    daysAgo: 13,
    testedOnBuild: null,
    qualityScore: 85,
    affectedBuilds: [],
    metaTitle: 'Release windows: when films reach streaming',
    metaDescription:
      'The gap between cinema and streaming has collapsed, but it has not vanished. How the modern release sequence works.',
    quickAnswer:
      'A typical film now reaches digital rental or purchase a few weeks after its cinema release, and a subscription streaming service some months later. The exact gap depends on the studio, how well the film performed and whether the studio owns a streaming service of its own.',
    body: `The "release window" is the gap between a film appearing in cinemas and
becoming available elsewhere. It used to be long and rigid. It is now short and
negotiable, and it varies enormously between films.

## The modern sequence

Most wide releases move through roughly this order:

1. **Cinemas.** The exclusive window, now commonly a few weeks rather than
   several months.
2. **Digital rental and purchase.** Available to buy or rent from digital
   storefronts, often while the film is still showing somewhere.
3. **Subscription streaming.** Included with a service, typically some months
   after release.
4. **Broadcast television.** Later still, and increasingly an afterthought.

Physical media, where it appears, usually arrives near the digital purchase stage.

## Why the window collapsed

Cinemas historically insisted on long exclusivity, and studios accepted it
because cinemas were the whole business. Two things changed that.

First, studios launched their own streaming services and now have a direct
incentive to move films onto them quickly — a film that drives subscriptions is
worth more to the parent company than a few extra weeks of ticket sales.

Second, the pandemic period forced experiments with simultaneous and
near-simultaneous release, and the industry discovered the sky did not fall.
Windows never returned to their previous length.

## Why it varies so much between films

**How well it performed.** A film still selling tickets stays in cinemas longer.
One that opened poorly can reach digital in a fortnight.

**Who made it.** A studio with its own streaming service tends to move faster.
An independent film without one sells to the highest bidder, which takes longer
to negotiate.

**Contractual terms.** Directors and stars sometimes negotiate a guaranteed
theatrical window into their contracts.

**Awards strategy.** A film campaigning for awards may hold a longer cinema run
for eligibility and prestige reasons.

## How to find out for a specific film

- Check the studio's own streaming service first — if the studio owns one, that
  is where it will land.
- Digital storefronts list pre-order availability, which is the earliest reliable
  signal of a date.
- Be sceptical of aggregator sites that predict dates. They are usually
  extrapolating from averages, not reporting confirmed information.

## What this means practically

If you want to see something in a cinema, the window is short enough that
waiting is a real choice with a real cost — but long enough that "it will be
streaming next week" is usually wrong. A few weeks to digital rental and several
months to a subscription service is the realistic expectation for most releases.`,
    faq: [
      {
        question: 'How long after cinemas does a film reach streaming?',
        answer:
          'Digital rental or purchase commonly arrives a few weeks after release; inclusion in a subscription service usually takes several months. It varies widely by studio and by how the film performed.',
      },
      {
        question: 'Why do some films go to streaming almost immediately?',
        answer:
          'Usually weak box office. Once ticket sales fall away, the studio gains more from moving the film to digital and to its own subscription service.',
      },
      {
        question: 'Is the cinema window ever exclusive any more?',
        answer:
          'Yes, but it is much shorter than it once was — typically weeks rather than months, and negotiated film by film rather than fixed across the industry.',
      },
    ],
    sources: [],
  },

  /* ---------------------------------------------------------------- sports */
  {
    slug: 'how-the-football-transfer-window-works',
    title: 'How the football transfer window works',
    categorySlug: 'sports',
    authorSlug: 'theo-abara',
    daysAgo: 3,
    testedOnBuild: null,
    qualityScore: 87,
    affectedBuilds: [],
    metaTitle: 'How the football transfer window works',
    metaDescription:
      'Windows, deadlines, loans, free transfers and why a deal collapses at 11pm. The rules behind the transfer window explained.',
    quickAnswer:
      'Clubs can only register new players during defined transfer windows — a longer one in the summer and a shorter one in mid-season. A deal needs agreement between both clubs, agreed personal terms with the player, a passed medical, and paperwork filed before the deadline. Missing any one of those kills it.',
    body: `Transfer coverage is relentless and mostly speculation. The underlying rules are
straightforward.

## What a transfer window is

A transfer window is the period in which a club may register a player it has
signed. Outside it, clubs can still negotiate and agree deals, but the player
cannot be registered to play.

There are two per season in most leagues:

- **The summer window** — the long one, between seasons.
- **The mid-season window** — shorter, usually in January in European leagues.

Exact opening and closing dates are set by each national association within
limits agreed internationally, which is why windows in different countries close
on different days. A club in one league can sometimes sell to a club in another
after its own window has shut.

## The four things a deal needs

A transfer is not one negotiation but several, and all must succeed.

1. **Agreement between the clubs** on the fee, plus any add-ons — appearances,
   trophies, a sell-on percentage of a future transfer.
2. **Personal terms with the player** — wages, contract length, bonuses, and
   sometimes a release clause. Agreed with the player's representatives.
3. **A medical.** Failed or concerning medicals genuinely do end deals.
4. **Registration paperwork filed before the deadline.**

Reports that a deal is "agreed" usually mean only the first of these.

## The types of deal

**Permanent transfer.** A fee is paid, the player's registration moves
permanently.

**Loan.** The player moves temporarily, with the parent club retaining the
registration. The loaning club typically pays a fee and some share of wages.
Loans may include an option or an obligation to buy — an obligation triggers
automatically if defined conditions are met.

**Free transfer.** A player out of contract can move without a fee. This is why
clubs sell a year before a contract expires rather than lose the player for
nothing.

**Release clause.** A figure written into a contract at which the club must allow
negotiations to begin. It does not force the player to move.

## Why deals collapse at the deadline

The final hours produce chaos for structural reasons rather than drama.

Transfers are frequently **chained**: club A will only sell if it can sign a
replacement from club B, which in turn wants a replacement from club C. One
failure collapses the chain.

Then there is paperwork. Registration documents must be submitted before the
deadline, and late submissions have been rejected over minutes. Clubs sometimes
file a deal sheet to signal an agreement is close, but the completed paperwork
still has to follow within a defined extension.

## How to read transfer reporting

- **"Talks are ongoing"** — could mean anything, including an initial phone call.
- **"Medical scheduled"** — genuinely late stage, though not final.
- **"Here we go" style declarations** — reputable reporters have good sources,
  but they are still reporting an intention, not a completed registration.
- **A fee reported to the pound** — treat as an estimate. Add-ons mean the real
  total is often unknown for years, and clubs rarely confirm figures.

The only reliable confirmation is the club's own announcement.`,
    faq: [
      {
        question: 'Can a club sign a player outside the transfer window?',
        answer:
          'Generally no, because the player cannot be registered. Limited exceptions exist in some competitions, most commonly for free agents who were already out of contract or as emergency cover for goalkeepers.',
      },
      {
        question: 'What is the difference between an option and an obligation to buy?',
        answer:
          'An option lets the loaning club decide whether to make the move permanent. An obligation triggers automatically once agreed conditions are met, such as a number of appearances or avoiding relegation.',
      },
      {
        question: 'Why do clubs sell players with a year left on a contract?',
        answer:
          'Because a player who reaches the end of a contract can leave for nothing. Selling a year early is usually the last chance to recover a fee.',
      },
      {
        question: 'Are reported transfer fees accurate?',
        answer:
          'Treat them as approximate. Many clubs never confirm figures, and add-ons based on appearances or trophies mean the final total may not be settled for years.',
      },
    ],
    sources: [PREMIER_LEAGUE, FIFA],
  },

  {
    slug: 'how-var-works-in-football',
    title: 'How VAR works, and what it can actually overturn',
    categorySlug: 'sports',
    authorSlug: 'theo-abara',
    daysAgo: 8,
    testedOnBuild: null,
    qualityScore: 88,
    affectedBuilds: [],
    metaTitle: 'How VAR works in football',
    metaDescription:
      'VAR only intervenes in four situations, and only for clear and obvious errors. What that means in practice, and why some decisions still stand.',
    quickAnswer:
      'VAR can only review four categories: goals, penalty decisions, direct red cards, and mistaken identity. Within those, it intervenes only for a clear and obvious error or a serious missed incident. Everything else — including most fouls and second yellow cards — stays with the referee regardless of what replays show.',
    body: `Most arguments about VAR are really arguments about its scope. It is far
narrower than viewers assume.

## The four reviewable categories

VAR may only intervene on:

1. **Goals** — and the phase of play leading to them, including offside, fouls
   and whether the ball left the field.
2. **Penalty decisions** — whether one should have been given, or wrongly given.
3. **Direct red card incidents** — violent conduct, serious foul play, denial of
   an obvious goalscoring opportunity.
4. **Mistaken identity** — the referee cautioning or sending off the wrong player.

Anything outside these four is not reviewable. A second yellow card is the
notable exclusion: even if replays show it was wrong, VAR cannot intervene,
because a second yellow is not a direct red.

## The "clear and obvious" threshold

Within those categories, VAR does not re-referee the decision. It checks for a
**clear and obvious error** or a **serious missed incident**.

This is the source of most frustration. If a decision is arguable — a soft
contact, a marginal handball — the on-field call stands, because it was not
clearly wrong. VAR is designed to catch mistakes, not to produce the decision a
different referee might have made.

Offside is the exception, and deliberately so. Position is a matter of fact
rather than judgement, so it is assessed to fine margins. Semi-automated systems
speed that up by tracking the ball and body points automatically, which shortens
delays but does not change the underlying rule.

## What happens during a check

Every goal and every penalty is checked automatically — this happens constantly,
usually in seconds, without stopping play.

If the VAR believes there may be a clear error:

1. Play is stopped at the next natural break.
2. The VAR recommends a review.
3. The referee either accepts the VAR's information for factual matters such as
   offside, or goes to the pitchside monitor for a subjective judgement.
4. The referee makes the final decision. The VAR advises; it does not overrule.

## Why decisions still feel inconsistent

- **Judgement remains judgement.** Handball and contact in the box involve
  interpretation that no camera resolves.
- **The threshold is a judgement too.** Whether an error is "clear and obvious"
  is itself subjective.
- **Camera angles differ by fixture.** Not every match has the same coverage.
- **Different competitions apply protocols differently**, so what is reviewed in
  one league may not be in another.

## What VAR was and was not meant to fix

It was introduced to eliminate the small number of decisive, obviously wrong
decisions — a goal from a clear offside, a penalty for a foul that happened
outside the box, a sending-off of the wrong player.

It was never intended to make every decision correct, and it cannot. Judging it
against that standard guarantees disappointment.`,
    faq: [
      {
        question: 'Why can VAR not overturn a second yellow card?',
        answer:
          'Because the reviewable category is direct red cards only. A second caution is not a direct red, so it falls outside VAR’s scope even when replays suggest the decision was wrong.',
      },
      {
        question: 'What does "clear and obvious error" mean?',
        answer:
          'It means VAR only intervenes when the on-field decision was plainly wrong, not when it was merely debatable. Arguable calls are left with the referee by design.',
      },
      {
        question: 'Why is offside judged to such fine margins?',
        answer:
          'Offside is a factual question rather than a judgement call, so the clear-and-obvious threshold does not apply in the same way. A player is either ahead of the line or not.',
      },
      {
        question: 'Does the VAR make the final decision?',
        answer:
          'No. The VAR reviews and recommends; the on-field referee decides, usually after viewing the pitchside monitor for subjective incidents.',
      },
    ],
    sources: [PREMIER_LEAGUE, FIFA],
  },

  {
    slug: 'how-promotion-and-relegation-work',
    title: 'How promotion and relegation work',
    categorySlug: 'sports',
    authorSlug: 'theo-abara',
    daysAgo: 16,
    testedOnBuild: null,
    qualityScore: 85,
    affectedBuilds: [],
    metaTitle: 'How promotion and relegation work',
    metaDescription:
      'The pyramid, automatic places, play-offs and what relegation actually costs a club financially.',
    quickAnswer:
      'European leagues operate as a pyramid: finish near the top and you move up a division, finish at the bottom and you move down. Most leagues promote two or three clubs automatically and decide a final place through play-offs. The financial consequences of moving between divisions are usually larger than the sporting ones.',
    body: `Promotion and relegation are the defining feature of European league football
and the part that most confuses newcomers from closed-league sports.

## The pyramid

Divisions are stacked. The bottom clubs in each division drop into the one below
at the end of a season; the top clubs in that lower division come up. The system
continues down through semi-professional and amateur levels, so in principle a
club can rise from the very bottom to the top over enough seasons.

There is no franchise, no draft and no guaranteed place. Membership of a division
is earned each season.

## How the places are decided

Formats vary by country, but the common pattern is:

- **Automatic promotion** for the top two or three clubs.
- **Play-offs** among the next several clubs for one further place. The play-off
  is a knockout, so the team that finishes highest does not necessarily go up.
- **Automatic relegation** for the bottom two or three.

The play-off structure is why a club can finish well clear of another over a
whole season and still be the one that stays down.

## Tie-breakers

When clubs finish level on points, leagues apply a defined order of tie-breakers.
The most common are goal difference, then goals scored, then head-to-head record
— but the order varies by competition, and some leagues put head-to-head first.
It is worth checking the specific league's rules before assuming.

## What relegation actually costs

The sporting drop is the visible part. The financial drop is larger.

- **Broadcast revenue** falls sharply, often by a large multiple, because top-tier
  television deals dwarf those below.
- **Commercial and sponsorship income** typically falls with it, and some
  contracts contain relegation clauses reducing payments automatically.
- **Player contracts** often include wage reductions on relegation, precisely
  because clubs cannot sustain top-division wages on lower-division income.
- **Squad departures** follow, since release clauses are frequently triggered.

Some leagues pay **parachute payments** — reducing payments over a few seasons to
cushion the fall. These are contested, because they can give recently relegated
clubs a structural advantage over established ones in the lower division.

## Why it matters to how the season is watched

Because the bottom of the table carries real consequences, matches between poor
teams late in a season are often more tense than matches at the top. There is no
equivalent of playing out a lost season — every division has something to lose,
all the way down.`,
    faq: [
      {
        question: 'How many teams get promoted each season?',
        answer:
          'Typically two or three automatically, with one further place decided by play-offs. The exact number varies by country and division.',
      },
      {
        question: 'Can a team that finishes third go up ahead of a team that finishes second?',
        answer:
          'Not usually ahead of an automatic place, but play-offs mean a lower-finishing club can be promoted while a higher-finishing one is not, because the play-off is a knockout.',
      },
      {
        question: 'What are parachute payments?',
        answer:
          'Reducing payments made to relegated clubs for a few seasons to soften the loss of top-division broadcast income. They are controversial because they can advantage relegated clubs over established lower-division ones.',
      },
    ],
    sources: [PREMIER_LEAGUE],
  },

  /* ----------------------------------------------------------------- money */
  {
    slug: 'what-an-interest-rate-rise-means-for-you',
    title: 'What an interest rate rise actually means for your money',
    categorySlug: 'money',
    authorSlug: 'rosa-linden',
    daysAgo: 5,
    testedOnBuild: null,
    qualityScore: 89,
    affectedBuilds: [],
    metaTitle: 'What an interest rate rise means for you',
    metaDescription:
      'Central bank rate changes reach mortgages, savings, loans and prices at different speeds. What moves quickly, what lags, and what to check.',
    quickAnswer:
      'When a central bank raises its base rate, borrowing gets more expensive and saving pays more — but the two do not move at the same speed. Variable-rate debt reprices almost immediately, fixed-rate deals only at renewal, and savings rates typically rise slowest of all.',
    body: `Rate decisions are reported as a single number, which hides the fact that they
reach different parts of your finances at very different speeds.

*This is general information about how rate changes work, not advice about your
own circumstances.*

## What the base rate is

The base rate is what a central bank charges commercial banks. Banks price their
own products relative to it, so a change ripples outward — but the ripple is
uneven and some of it never arrives.

## What moves immediately

**Tracker and variable-rate mortgages.** A tracker follows the base rate by
contract, so a rise passes through almost at once, usually the following month.
Standard variable rates are set by the lender and typically follow quickly.

**Credit cards and overdrafts.** These reprice at the lender's discretion, and
tend to move up promptly.

**Variable-rate loans.** Same pattern.

## What lags

**Fixed-rate mortgages.** Nothing changes until the deal ends. The impact
arrives all at once at renewal, which is why the timing of your fixed period
matters more than any individual rate decision.

**New fixed deals.** These are priced on expectations of future rates rather
than today's rate, so they often move *before* a decision, in anticipation.

**Savings accounts.** Historically the slowest to rise and the quickest to fall.
Banks are under no obligation to pass on a rise, and frequently pass on only part
of it.

## What to actually check

**If you have a mortgage:** find out whether you are on a fix, a tracker, or a
standard variable rate, and if fixed, the exact end date. That date determines
your exposure far more than the current rate does.

**If you have savings:** compare what your account pays against current rates.
Long-standing accounts often pay well below what the same bank offers new
customers, and moving is usually straightforward.

**If you have debt:** work out which of it is variable. Variable-rate debt is
where a rise actually costs you money, and it is usually the most expensive debt
to begin with.

## Why rates get raised at all

The usual purpose is to slow inflation. Higher rates make borrowing more
expensive and saving more attractive, which reduces spending, which reduces
upward pressure on prices.

The mechanism is blunt and slow — effects take many months to work through — and
it applies to the whole economy rather than to whichever part is causing the
problem. That is why decisions are contested even among economists.

## What it means for prices

A rise does not make prices fall. It is intended to slow the *rate* at which they
rise. Inflation falling from a high figure to a lower one still means prices are
increasing, only more slowly. This distinction causes a great deal of confusion
in reporting.`,
    faq: [
      {
        question: 'Why did my savings rate not go up when the base rate did?',
        answer:
          'Banks are not required to pass on increases and often pass on only part. Savings rates are typically the slowest product to rise and among the quickest to fall.',
      },
      {
        question: 'I am on a fixed-rate mortgage. Does a rise affect me?',
        answer:
          'Not until your fixed period ends. At that point you move to whatever rates are available then, which is why the end date of the fix matters more than any single decision.',
      },
      {
        question: 'Does raising rates bring prices down?',
        answer:
          'It aims to slow how fast prices rise, not to reduce them. Falling inflation still means prices are increasing, just more slowly than before.',
      },
      {
        question: 'How quickly do rate changes take effect?',
        answer:
          'Variable-rate borrowing repricing happens within weeks. The wider economic effect is much slower and generally takes many months to work through.',
      },
    ],
    sources: [BOE_RATE, FED_POLICY],
  },

  {
    slug: 'how-compound-interest-works',
    title: 'How compound interest works, in both directions',
    categorySlug: 'money',
    authorSlug: 'rosa-linden',
    daysAgo: 11,
    testedOnBuild: null,
    qualityScore: 88,
    affectedBuilds: [],
    metaTitle: 'How compound interest works',
    metaDescription:
      'Compounding is the same mechanism whether it is growing your savings or your credit card balance. A plain explanation with worked numbers.',
    quickAnswer:
      'Compound interest means you earn interest on your interest, not just on the original amount. It makes long-term saving grow faster the longer it runs — and makes unpaid debt grow the same way. Time matters more than the amount you start with.',
    body: `Compounding is the single most useful financial concept to understand, and it
is usually explained badly.

*This is general information, not advice about your own circumstances.*

## Simple versus compound

**Simple interest** is calculated only on the original amount. Put £1,000
somewhere paying 5% simple interest and you get £50 every year, forever.

**Compound interest** is calculated on the original amount *plus* the interest
already added. Year one you earn £50, so year two is calculated on £1,050 and
earns £52.50, and so on.

The gap looks trivial early and becomes large later.

## Worked through

£1,000 at 5% compounded annually, rounded:

- After 1 year — £1,050
- After 5 years — £1,276
- After 10 years — £1,629
- After 20 years — £2,653
- After 30 years — £4,322

Note the shape. The first decade adds about £629. The third decade alone adds
about £1,700. Nothing changed except time.

## Why time beats amount

This is the practical lesson. Someone saving a modest amount for thirty years
generally ends up ahead of someone saving considerably more for ten, because the
early money has had far longer to compound.

It is also why the most valuable thing about starting early is not the money
contributed but the years bought.

## The rule of 72

A quick mental shortcut: divide 72 by the annual rate to estimate how many years
it takes to double.

- At 3%, roughly 24 years.
- At 6%, roughly 12 years.
- At 9%, roughly 8 years.

Approximate, but close enough to reason with.

## It works exactly the same on debt

This is the half people skip. A credit card balance compounds against you on
precisely the same mathematics, usually at a far higher rate than any savings
account pays.

At a typical card rate, an unpaid balance can double in a handful of years
without a single new purchase. Minimum payments are structured to cover interest
and very little principal, which is why a balance paid at the minimum can persist
for decades.

The implication is uncomfortable but simple: clearing high-interest debt is
mathematically equivalent to earning that same rate, guaranteed, tax-free. There
is rarely a savings account that competes with it.

## What erodes the effect

**Inflation.** Growth needs to be measured in what the money buys. 5% growth with
4% inflation is roughly 1% in real terms.

**Fees.** A percentage taken annually compounds against you the same way. A
seemingly small annual charge takes a substantial share of a long-run total.

**Tax**, depending on the account and jurisdiction.

**Withdrawals.** Taking money out resets the clock on the part you removed. The
mechanism rewards leaving it alone.

## Compounding frequency

Interest can compound annually, monthly or daily. More frequent compounding
produces slightly more, but the difference is small compared with the rate
itself and with time. Compare the annual equivalent figure that providers are
generally required to publish rather than trying to work it out yourself.`,
    faq: [
      {
        question: 'What is the difference between simple and compound interest?',
        answer:
          'Simple interest is calculated only on the original amount. Compound interest is calculated on the original amount plus interest already earned, so growth accelerates over time.',
      },
      {
        question: 'What is the rule of 72?',
        answer:
          'A shortcut for estimating doubling time: divide 72 by the annual percentage rate. At 6%, money roughly doubles in twelve years.',
      },
      {
        question: 'Does compound interest apply to debt?',
        answer:
          'Yes, identically. Unpaid credit card balances compound against you, typically at rates far higher than savings accounts pay, which is why clearing expensive debt usually beats saving.',
      },
      {
        question: 'Is it better to start early or save more?',
        answer:
          'Time is generally the more powerful factor, because early contributions compound for longer. Both matter, but years cannot be bought back later.',
      },
    ],
    sources: [BOE_RATE],
  },

  {
    slug: 'how-big-should-an-emergency-fund-be',
    title: 'How big should an emergency fund actually be?',
    categorySlug: 'money',
    authorSlug: 'rosa-linden',
    daysAgo: 18,
    testedOnBuild: null,
    qualityScore: 86,
    affectedBuilds: [],
    metaTitle: 'How big should an emergency fund be?',
    metaDescription:
      'The standard answer is three to six months of expenses. What that figure is based on, and when it should be higher or lower.',
    quickAnswer:
      'The common guidance is three to six months of essential expenses — not income — held somewhere you can reach quickly. The right figure depends mainly on how secure and predictable your income is; irregular or single-income households should aim towards the higher end.',
    body: `An emergency fund exists to stop an unexpected cost turning into expensive
debt. That is its whole purpose, and it explains every rule about how to hold it.

*This is general information, not advice about your own circumstances.*

## Base it on expenses, not income

Work out what you must spend in a month to keep things running:

- Rent or mortgage
- Utilities and council tax or equivalent
- Food
- Transport to work
- Insurance and minimum debt payments
- Childcare or care costs

Exclude anything you would cut immediately in a crisis — subscriptions, eating
out, holidays. The result is usually noticeably lower than monthly income, which
makes the target less daunting than it first appears.

## Three months or six?

**Towards three months** if your income is stable and predictable, you have more
than one earner in the household, your skills are in demand, and you have no
dependants.

**Towards six months or beyond** if you are self-employed or on irregular
income, you are the only earner, you have dependants, you work in a volatile
sector, or you would take a long time to replace your role.

Someone self-employed with a mortgage and children is in a genuinely different
position from someone renting on a salaried contract with a partner also
earning. The same number does not serve both.

## Where to keep it

Three requirements, in order:

1. **Accessible.** Reachable within a day or two. An emergency fund locked away
   for notice periods is not an emergency fund.
2. **Stable in value.** It must be worth what you think it is worth on the day
   you need it. That rules out anything whose price fluctuates.
3. **Earning something.** Once the first two are satisfied, prefer an account
   paying a reasonable rate over one paying nothing.

Keeping it in a separate account from day-to-day money is worth doing, simply
because money that is visible in a current account tends to get spent.

## Building it without it feeling impossible

- Start with a smaller first milestone — one month of essentials, or a fixed
  round number. Most genuine emergencies are moderate, not catastrophic.
- Automate a transfer on payday so it happens before the money is available to
  spend.
- Add irregular income — refunds, bonuses, gifts — rather than absorbing it.

## The exception worth knowing

If you are carrying high-interest debt, there is a real tension. Money sitting
in savings earning a few percent while a card charges many times that is losing
you money every month.

A common approach is to build a small buffer first — enough to handle a
moderate unexpected cost without reaching for the card — then concentrate on
clearing the expensive debt, then build the full fund afterwards. Which balance
is right depends on your situation and how secure your income is.

## When to use it

For genuine emergencies: loss of income, an urgent repair, an unexpected
essential cost. Not for planned expenses, which should be saved for separately,
and not for opportunities.

If you use it, rebuilding it becomes the priority. That is the fund working as
intended, not a failure.`,
    faq: [
      {
        question: 'Should an emergency fund be based on income or expenses?',
        answer:
          'Essential expenses. It needs to cover what you must pay while income is interrupted, which is usually considerably less than your full income.',
      },
      {
        question: 'Should I save or pay off debt first?',
        answer:
          'A common approach is a small buffer first, then clearing high-interest debt, then completing the fund. Money earning a few percent while a card charges far more is losing ground each month.',
      },
      {
        question: 'Where should I keep an emergency fund?',
        answer:
          'Somewhere accessible within a day or two, stable in value, and paying a reasonable rate. Accessibility and stability come before return.',
      },
      {
        question: 'Is three months enough?',
        answer:
          'It is a reasonable target for stable, salaried, multi-earner households. Irregular income, sole earners and those with dependants generally need more.',
      },
    ],
    sources: [BOE_RATE],
  },

  /* ---------------------------------------------------------------- health */
  {
    slug: 'how-much-sleep-do-adults-need',
    title: 'How much sleep do adults actually need?',
    categorySlug: 'health',
    authorSlug: 'sam-okonkwo',
    daysAgo: 7,
    testedOnBuild: null,
    qualityScore: 89,
    affectedBuilds: [],
    metaTitle: 'How much sleep do adults actually need?',
    metaDescription:
      'Seven to nine hours is the standard guidance. What that range is based on, why individual needs vary, and what actually helps.',
    quickAnswer:
      'Most adults need seven to nine hours a night. The reliable signal is not a number but how you function: waking without an alarm feeling rested, and staying alert through the day without relying on caffeine, suggests you are getting enough. Persistent daytime sleepiness suggests you are not.',
    body: `Sleep advice online is dominated by people selling something. The underlying
guidance from health bodies is unglamorous and fairly stable.

*This is general health information, not medical advice. Speak to a clinician
about your own situation, particularly if sleep problems persist.*

## The guidance

Health services and sleep research bodies broadly converge on **seven to nine
hours** for most adults, with older adults often at the lower end of that range.

Two things about that number are routinely misread:

- **It is a range, not a target.** Needing eight and a half hours is not a
  failure, and neither is functioning well on seven.
- **It refers to sleep, not time in bed.** Most people spend meaningfully longer
  in bed than they spend asleep.

## A better test than counting hours

Rather than tracking a number, ask:

- Do you wake up naturally near your alarm, or does it always feel brutal?
- Are you alert through the afternoon without caffeine to prop it up?
- Do you fall asleep within roughly twenty minutes of lying down?
- On free days, do you sleep dramatically longer than on work days?

That last one is telling. A large gap suggests you are accumulating a shortfall
during the week and catching up when allowed to.

## Consistency matters as much as duration

Going to bed and getting up at roughly the same times — including at weekends —
supports the body clock that governs when you feel sleepy and alert. Large
swings in schedule produce something similar to jet lag without travelling.

If you change one thing, a consistent **wake** time is usually the more effective
lever, because it anchors the rest of the cycle.

## What the evidence supports

**Light exposure.** Daylight early in the day helps set the body clock. Bright
light late in the evening pushes it later.

**Caffeine timing.** Caffeine has a long half-life — a mid-afternoon coffee can
still be active at bedtime. If you sleep badly, moving your cut-off earlier is a
cheap experiment.

**Alcohol.** It shortens the time to fall asleep and worsens sleep quality later
in the night. It is a sedative, not a sleep aid.

**A cool, dark, quiet room.** Unglamorous and well supported.

**Getting out of bed if you cannot sleep.** Lying awake trains an association
between bed and frustration. Standard advice is to get up, do something calm and
dimly lit, and return when sleepy.

## What is oversold

**Sleep tracking devices.** They estimate stages from movement and heart rate
rather than measuring them directly, and accuracy at stage level is limited. For
some people, anxiety about the score becomes its own problem.

**Sleep stage optimisation.** You cannot meaningfully direct how much deep or REM
sleep you get. Adequate total sleep, consistently, is the controllable part.

**Most supplements.** Evidence is generally weak or applies to specific
conditions such as jet lag. Anything you consider taking regularly is worth
discussing with a pharmacist or doctor first.

## When to seek help

Talk to a clinician if:

- Poor sleep persists for weeks despite reasonable habits.
- You are told you snore heavily, gasp or stop breathing during sleep — possible
  signs of sleep apnoea, which is common, treatable and frequently undiagnosed.
- You are exhausted despite apparently sleeping enough.
- Sleepiness affects your safety, particularly driving.

These are medical issues, not discipline problems, and they respond to
treatment.`,
    faq: [
      {
        question: 'Is six hours of sleep enough?',
        answer:
          'For most adults, no. A small minority function well on less, but people who believe they are in that group usually show measurable impairment they have adapted to rather than avoided.',
      },
      {
        question: 'Can I catch up on sleep at the weekend?',
        answer:
          'Partially. Extra sleep helps recover some deficit, but it does not fully reverse the effects of chronic short sleep, and large weekend shifts disrupt the body clock.',
      },
      {
        question: 'Are sleep trackers accurate?',
        answer:
          'They are reasonable at estimating how long you slept and much less reliable at identifying sleep stages. Treat trends as indicative and ignore single-night scores.',
      },
      {
        question: 'Does alcohol help you sleep?',
        answer:
          'It helps you fall asleep faster but degrades sleep quality later in the night, commonly causing early waking. It is a sedative rather than a sleep aid.',
      },
    ],
    sources: [NHS_SLEEP, NHS_LIVEWELL],
  },

  {
    slug: 'do-you-really-need-10000-steps-a-day',
    title: 'Do you really need 10,000 steps a day?',
    categorySlug: 'health',
    authorSlug: 'sam-okonkwo',
    daysAgo: 12,
    testedOnBuild: null,
    qualityScore: 88,
    affectedBuilds: [],
    metaTitle: 'Do you really need 10,000 steps a day?',
    metaDescription:
      'The 10,000 figure came from a marketing campaign, not research. What the evidence supports, and why the first few thousand steps matter most.',
    quickAnswer:
      'The 10,000 figure originated as a marketing slogan, not a research finding. Studies consistently show meaningful health benefits well below it, with the largest gains coming from moving from very low activity to moderate. More steps generally help, but the benefit curve flattens.',
    body: `10,000 steps is the most successful health slogan ever written. It is also not
a scientific recommendation.

*This is general health information, not medical advice.*

## Where the number came from

It traces to a Japanese pedometer marketed in the 1960s, whose name played on a
character resembling a walking figure. It was a memorable round number for
selling a device — not a threshold derived from research.

That it turned out to be roughly reasonable is a happy accident, not evidence.

## What the research actually indicates

Studies looking at step counts and health outcomes consistently find:

- **Benefits appear well below 10,000.** Meaningful reductions in mortality risk
  show up at step counts substantially lower than the slogan.
- **The steepest gains are at the bottom.** Moving from very low activity — a
  couple of thousand steps a day — to moderate activity produces the largest
  change. Going from 8,000 to 12,000 produces far less additional benefit than
  going from 2,000 to 6,000.
- **The curve flattens.** Benefits continue as counts rise but with diminishing
  returns, and plateau at some point.
- **Age matters.** Older adults tend to see benefits plateau at lower counts than
  younger adults.

The practical message: if you are currently inactive, the first few thousand
extra steps are the most valuable thing you will do. If you are already
reasonably active, chasing a round number is not where further health gains come
from.

## The official guidance is not about steps

Health bodies generally frame recommendations in **time and intensity**, not step
counts — commonly around 150 minutes of moderate activity per week, or 75 minutes
of vigorous activity, plus muscle-strengthening work on two or more days.

Steps are a proxy that happens to be easy to measure. They do not capture
intensity, and they do not capture strength training at all, which is the part
most commonly neglected.

## Why intensity matters

Ten thousand slow steps and ten thousand brisk steps are not equivalent. Moderate
intensity — brisk enough that you could talk but not sing comfortably — delivers
more benefit for the same count.

If you are already walking a lot, increasing pace is usually a better lever than
increasing volume.

## What steps miss entirely

**Strength.** Walking does little for muscle mass and bone density, both of which
matter increasingly with age. Two sessions a week of resistance work of any kind
addresses a gap that steps cannot.

**Non-step activity.** Cycling, swimming and rowing barely register on a step
count while being excellent exercise. Do not let the metric distort the choice.

**Sitting time.** Long uninterrupted sitting appears to carry risk somewhat
independently of total activity. Breaking it up matters even for people who hit
their targets.

## A more useful way to think about it

Set a target relative to where you are, not to a slogan. If you currently average
3,000, aiming for 5,000 is both achievable and where the largest benefit lies. If
you average 9,000, add intensity or strength work rather than more volume.

The best target is the one you will still be doing in six months.`,
    faq: [
      {
        question: 'Where did the 10,000 steps figure come from?',
        answer:
          'From marketing for a pedometer sold in Japan in the 1960s. It was a memorable round number for advertising, not a conclusion from research.',
      },
      {
        question: 'How many steps a day is actually beneficial?',
        answer:
          'Studies find meaningful benefits well below 10,000, with the largest gains from moving out of very low activity. Any sustained increase from a low baseline is worthwhile.',
      },
      {
        question: 'Is walking enough exercise on its own?',
        answer:
          'It is excellent for cardiovascular health but does little for muscle and bone. Guidance generally adds muscle-strengthening activity on two or more days a week.',
      },
      {
        question: 'Does walking speed matter?',
        answer:
          'Yes. Moderate intensity — brisk enough to talk but not sing comfortably — delivers more benefit than the same number of slow steps.',
      },
    ],
    sources: [WHO_ACTIVITY, NHS_LIVEWELL],
  },

  {
    slug: 'reading-nutrition-labels-properly',
    title: 'How to read a nutrition label properly',
    categorySlug: 'health',
    authorSlug: 'sam-okonkwo',
    daysAgo: 19,
    testedOnBuild: null,
    qualityScore: 85,
    affectedBuilds: [],
    metaTitle: 'How to read a nutrition label properly',
    metaDescription:
      'Per 100g versus per portion, where sugar hides in the ingredients list, and which front-of-pack claims mean nothing.',
    quickAnswer:
      'Compare products using the per-100g column, not per portion, because manufacturers choose portion sizes. Read the ingredients list — it runs in descending order by weight — and treat front-of-pack claims such as "natural" or "light" as marketing rather than nutrition information.',
    body: `Food labels are regulated, which means the numbers are reliable. The
presentation, however, is designed to be flattering.

*This is general information, not dietary advice.*

## Use per 100g to compare

Labels usually show two columns: **per 100g** and **per portion**.

Compare products using **per 100g**, always. It is the only consistent basis.
Portion sizes are set by the manufacturer, and a product can look moderate simply
by declaring a small portion.

Use **per portion** only to judge what you will actually eat — and check the
declared portion against reality. A "portion" that is a third of a small packet
is not how the packet gets eaten.

## Rough reference points per 100g

Common front-of-pack traffic-light thresholds are worth knowing:

- **Sugars** — low at 5g or below; high above roughly 22.5g
- **Fat** — low at 3g or below; high above roughly 17.5g
- **Saturated fat** — low at 1.5g or below; high above roughly 5g
- **Salt** — low at 0.3g or below; high above roughly 1.5g

These are guides for comparison, not rules. A food high in one figure is not
disqualified — context and overall diet matter more than any single number.

## The ingredients list tells you more than the numbers

Ingredients are listed in **descending order by weight**. The first three
generally make up most of the product.

Sugar appears under many names — sucrose, glucose, fructose, dextrose, maltose,
syrups of various kinds, molasses, fruit juice concentrate. Splitting sweeteners
across several names moves each one further down the list while the total stays
the same. If several appear, read them together.

## Claims and what they legally mean

Some front-of-pack terms are regulated and some are not.

**Regulated, with defined thresholds:** "low fat", "reduced sugar", "source of
fibre", "high in protein". These have legal definitions, though "reduced" only
means reduced relative to the standard version — which may still be high.

**Largely meaningless:** "natural", "artisan", "wholesome", "clean". These carry
no consistent definition.

**Frequently misread:** "light" or "lite" may refer to texture or colour rather
than calories. "No added sugar" permits naturally occurring sugars, which can be
substantial. "Fat free" products often add sugar to compensate for texture and
flavour.

## Two habits worth adopting

**Check salt, not sodium** — or multiply sodium by 2.5 to get salt. Products
listing sodium look lower than they are.

**Look at the whole packet, not the label.** If a packet contains 2.5 portions
and is routinely eaten in one sitting, the honest figure is the whole packet.

## Keep it in proportion

Labels are a comparison tool, not a scoring system. Their most useful function is
choosing between two similar products on a shelf — and for that, per 100g plus a
glance at the first three ingredients answers the question in seconds.`,
    faq: [
      {
        question: 'Should I look at per 100g or per portion?',
        answer:
          'Per 100g for comparing products, since portion sizes are chosen by the manufacturer. Per portion is useful only for judging what you will actually eat, and worth sanity-checking.',
      },
      {
        question: 'Does "no added sugar" mean sugar free?',
        answer:
          'No. It means none was added during production. Naturally occurring sugars, including from fruit juice concentrate, can still be substantial.',
      },
      {
        question: 'Why is sugar listed under so many names?',
        answer:
          'Because sweeteners are chemically different substances and each is listed separately. Splitting them keeps each lower down the descending-weight list even though the total is unchanged.',
      },
      {
        question: 'Is salt the same as sodium?',
        answer:
          'No. Salt is roughly 2.5 times the sodium figure. A label listing sodium will look lower than the equivalent salt content.',
      },
    ],
    sources: [NHS_LIVEWELL],
  },

  /* ---------------------------------------------------------------- gaming */
  {
    slug: 'what-frame-generation-actually-does',
    title: 'What frame generation actually does to your games',
    categorySlug: 'gaming',
    authorSlug: 'iris-vale',
    daysAgo: 10,
    testedOnBuild: null,
    qualityScore: 88,
    affectedBuilds: [],
    metaTitle: 'What frame generation actually does',
    metaDescription:
      'Frame generation raises the frame counter without reducing input latency. When it helps, when it hurts, and why the number lies.',
    quickAnswer:
      'Frame generation inserts synthesised frames between rendered ones, so the frame counter rises but responsiveness does not improve — and latency usually gets slightly worse. It works well for smoothing an already-decent frame rate on a high-refresh display, and badly for rescuing a game that is running poorly.',
    body: `Frame generation is the most misunderstood setting in modern PC gaming, largely
because the number it changes is the number people use to judge performance.

## What it does

Normally every frame you see was rendered by the GPU from the game state.

Frame generation inserts additional frames **between** rendered ones, constructed
by analysing consecutive rendered frames and motion data. Those inserted frames
were never simulated by the game. They are interpolations.

The result: the counter roughly doubles, and motion looks smoother on a display
fast enough to show it.

## Why it does not make a game more responsive

This is the crucial part.

A generated frame sits between two real ones. To create it, the system must
already have the *later* real frame — which means it holds that frame back
briefly rather than showing it immediately.

So input latency does not improve, and typically **worsens slightly**. Your
inputs are still processed at the underlying rendered rate.

A game showing 120fps with frame generation, rendering 60 internally, feels like
60fps with a little extra delay. It looks smoother than it feels, and that
mismatch is what people notice as "off" without being able to name it.

## Where it works well

- **Already-decent base frame rates.** Above roughly 60fps rendered, generation
  adds smoothness without much perceptible cost.
- **High-refresh displays.** Generating frames beyond your monitor's refresh rate
  achieves nothing.
- **Slower-paced games.** Strategy, simulation, story-driven and open-world games
  benefit visually and are forgiving about a few milliseconds.
- **GPU-bound scenarios**, which is what it is designed for.

## Where it works badly

- **Low base frame rates.** Below about 40fps rendered, generation amplifies the
  problems. There is more motion between real frames, so artefacts increase, and
  the latency is already poor. Doubling 30 to 60 on the counter does not fix a
  game that feels sluggish.
- **Competitive multiplayer.** Latency is the thing that matters, and this does
  not improve it.
- **CPU-limited games.** Frame generation addresses GPU limits. If the CPU is the
  bottleneck, it does not solve the underlying problem.

## Artefacts to look for

Generated frames are guesses, and guesses fail in predictable places:

- **Text and HUD elements** shimmering or smearing during motion.
- **Ghosting** around fast-moving objects against contrasting backgrounds.
- **Warping at screen edges** during quick camera turns.
- **Particle effects** breaking up.

These are most visible when you look for them, and much more visible at low base
frame rates.

## Do not confuse it with upscaling

Different technologies, frequently bundled together:

- **Upscaling** renders at a lower resolution and reconstructs a higher-resolution
  image. It genuinely increases rendered frames, so it **does** improve
  responsiveness.
- **Frame generation** adds frames between rendered ones. It does not.

Upscaling is generally the first thing to enable. Frame generation is a
smoothness option to add afterwards, once the underlying rate is already
acceptable.

## Judging performance honestly

Compare like with like. A benchmark with frame generation enabled is not
comparable to one without, and comparing across vendors requires knowing what
each has turned on.

If a setting matters to how a game *feels*, latency measurements tell you more
than the frame counter. If it matters to how a game *looks* in motion, the frame
counter is the right number — as long as you know which one you are judging.`,
    faq: [
      {
        question: 'Does frame generation reduce input lag?',
        answer:
          'No. It typically increases latency slightly, because the system holds back a rendered frame in order to interpolate between it and the previous one.',
      },
      {
        question: 'Should I use frame generation if my game runs at 30fps?',
        answer:
          'Generally not. At low base frame rates artefacts increase and the underlying responsiveness stays poor. Reduce settings or enable upscaling to raise the rendered rate first.',
      },
      {
        question: 'Is frame generation the same as DLSS or FSR upscaling?',
        answer:
          'No, though they are often bundled. Upscaling renders at lower resolution and reconstructs, genuinely increasing rendered frames. Frame generation inserts interpolated frames and does not improve responsiveness.',
      },
      {
        question: 'Why do generated frames look wrong around text?',
        answer:
          'HUD and text elements move differently from the 3D scene, so motion estimation handles them poorly. Shimmering or smearing on overlays is the most common visible artefact.',
      },
    ],
    sources: [],
  },

  {
    slug: 'why-game-downloads-are-so-large',
    title: 'Why game downloads are so enormous now',
    categorySlug: 'gaming',
    authorSlug: 'devan-brooks',
    daysAgo: 15,
    testedOnBuild: null,
    qualityScore: 86,
    affectedBuilds: [],
    metaTitle: 'Why game downloads are so large now',
    metaDescription:
      'Textures, audio, deliberate duplication and patches that redownload everything. What is actually taking up 150GB.',
    quickAnswer:
      'Most of the size is uncompressed textures and audio, not code. Games also duplicate data deliberately so mechanical drives can read it faster, ship assets for languages you do not use, and often rebuild large files during patching — which is why a small update can download tens of gigabytes.',
    body: `Installs have grown far faster than games have got bigger in scope. The reasons
are mostly technical and mostly invisible.

## Textures dominate

The overwhelming majority of a modern install is **texture data**. As target
resolutions rose from 1080p to 4K, texture resolution rose with them, and each
doubling multiplies the data.

A single surface in a modern game is not one image but several stacked maps —
colour, normal, roughness, metallic, ambient occlusion — each stored separately.
One material can consume what an entire level did two console generations ago.

## Audio is bigger than people expect

Fully voiced games with multiple language tracks carry enormous audio payloads.
Audio is often stored at low compression or uncompressed, because decompressing
costs CPU time during play.

This is why storefronts increasingly let you deselect language packs — and why
doing so can reclaim a lot of space.

## Deliberate duplication

Counter-intuitive but real: games sometimes store the **same asset multiple
times**.

On a mechanical hard drive, seeking to a different physical location is slow.
Storing a commonly used asset next to each level that needs it means the drive
reads sequentially instead of seeking. Duplicating data costs space and buys
loading speed.

As SSDs became standard this mattered less, and some newer titles are smaller
than their predecessors partly because they stopped doing it.

## Why patches download so much

The frustrating one: a patch described as fixing a few bugs downloads 40GB.

Game data is packed into large archive files. Changing something inside one can
require the whole archive to be rebuilt and redelivered, because the patching
system works at file level rather than tracking individual changed bytes.

Some platforms handle this far better than others, which is why the same update
can be a different size depending on where you bought the game. Storefronts also
sometimes need free space equal to the download *plus* the unpacked result, which
is why a 40GB patch can demand 80GB free.

## What you can actually do

**Remove unused language packs.** Often the easiest large win, where the
storefront supports it.

**Check for high-resolution texture packs.** Some games ship these as optional
add-ons that can be uninstalled separately.

**Move games rather than deleting them.** Most launchers support moving an
install to another drive without redownloading.

**Do not compress game folders manually.** Filesystem compression on game data
generally hurts load times more than the space is worth.

**Buy storage rather than fighting it.** Storage is cheap relative to the time
spent managing a full drive, and an SSD improves loading regardless.

## Is it getting better?

Partially. Faster storage removed the need for duplication, and modern
compression techniques help. But texture resolution keeps rising, and that is the
dominant factor. Expect large installs to remain normal.`,
    faq: [
      {
        question: 'Why is a small bug-fix patch tens of gigabytes?',
        answer:
          'Because game data sits inside large archive files. Changing something inside one can require rebuilding and redelivering the whole archive rather than just the changed bytes.',
      },
      {
        question: 'Can I delete language files to save space?',
        answer:
          'Often yes, where the storefront exposes the option. Voice audio for unused languages is one of the largest easily removable components.',
      },
      {
        question: 'Why does a 40GB patch need 80GB of free space?',
        answer:
          'The download is stored first and then unpacked into its final form, so both exist at once during installation.',
      },
      {
        question: 'Does installing games on an SSD reduce their size?',
        answer:
          'Not directly, but some newer games are smaller on SSDs because they no longer duplicate assets to compensate for slow mechanical drive seek times.',
      },
    ],
    sources: [],
  },

  {
    slug: 'how-to-reduce-input-lag-when-gaming',
    title: 'How to reduce input lag when gaming',
    categorySlug: 'gaming',
    authorSlug: 'devan-brooks',
    daysAgo: 21,
    testedOnBuild: null,
    qualityScore: 87,
    affectedBuilds: [],
    metaTitle: 'How to reduce input lag when gaming',
    metaDescription:
      'Input lag is the sum of several delays. The settings that genuinely help, in order of how much difference they make.',
    quickAnswer:
      'Input lag accumulates across your peripherals, the game engine, the GPU queue and the display. The biggest wins for most people are turning off V-Sync in favour of a variable refresh rate, enabling the driver-level low-latency option, and switching the TV or monitor into Game Mode.',
    body: `Input lag is the delay between moving your mouse and the screen reflecting it.
It is not one number but a chain, and the chain is only as good as its worst
link.

Work through these roughly in order — the early ones make the most difference for
the least effort.

## 1. Put the display in Game Mode

The single biggest win on a television, and frequently overlooked.

TVs apply extensive image processing — motion smoothing, noise reduction, scaling
— and each stage adds delay. **Game Mode** disables most of it.

The difference can be dramatic, sometimes over 100ms on a television that is
otherwise excellent. On a monitor the effect is smaller but Game Mode is still
usually worth enabling.

Also confirm the console or PC is on an input labelled for game or PC use, since
some sets apply different processing per input.

## 2. Turn off V-Sync and use variable refresh instead

Traditional V-Sync eliminates tearing by holding frames back, which adds latency
— often a frame or more, and worse when the frame rate is unstable.

Better approach:

1. Enable **variable refresh rate** on the display — G-Sync, FreeSync or the
   HDMI VRR equivalent. Check it is switched on in the monitor's own menu, not
   just on the PC.
2. Turn V-Sync **off** in the game.
3. Cap the frame rate slightly below the display's maximum refresh rate — a few
   frames under. This keeps you inside the variable refresh range, where latency
   is lowest.

## 3. Enable the driver low-latency setting

Both major GPU vendors provide a setting that limits how many frames the CPU may
queue ahead of the GPU. Fewer queued frames means fresher input.

Look for the low-latency or anti-lag option in the driver control panel and
enable it. Many games also expose an equivalent in their own settings; enabling
it in the game is generally preferable where available.

## 4. Deal with the frame rate itself

Higher rendered frame rates reduce latency directly, because frames arrive more
often.

Note this is about **rendered** frames. Frame generation raises the counter
without improving responsiveness — if latency is your goal, it is the wrong
setting.

Lowering graphics settings genuinely helps here, and the settings that cost the
most performance are usually shadows, reflections and volumetric effects.

## 5. Check the peripherals

- **Polling rate.** Set the mouse to 1000Hz if it supports it.
- **Wireless.** Modern gaming wireless is genuinely low-latency. Cheap generic
  wireless is not — if in doubt, plug in.
- **Controller connection.** Wired is consistently lower latency than Bluetooth.

These matter less than the display and V-Sync settings, but they are easy.

## 6. Rule out the connection for online play

Network delay is separate from input lag and often confused with it.

If the delay appears only in online play, it is the network. Use a wired
connection where possible, check whether anything else is saturating the
connection, and remember that a distant server adds delay nothing local can fix.

## What does not help

- **"Gaming" HDMI or Ethernet cables** at premium prices. A cable meets the
  specification or it does not.
- **Registry tweaks and optimiser utilities.** Generally placebo, occasionally
  harmful.
- **Frame generation**, for the reason above.
- **Overclocking**, which raises frame rates modestly but is far more effort than
  the settings above for less benefit.`,
    faq: [
      {
        question: 'What is the difference between input lag and ping?',
        answer:
          'Input lag is local delay between your action and the screen updating. Ping is network round-trip time to a server. Both feel like sluggishness but have entirely separate causes and fixes.',
      },
      {
        question: 'Should I turn V-Sync off completely?',
        answer:
          'Off is best for latency if you have a variable refresh rate display and cap the frame rate slightly below its maximum. Without variable refresh you are trading tearing against latency.',
      },
      {
        question: 'Does Game Mode reduce picture quality?',
        answer:
          'It disables post-processing such as motion smoothing, so the image can look different. For gaming the latency reduction is almost always the better trade.',
      },
      {
        question: 'Is wireless always worse for input lag?',
        answer:
          'No. Modern dedicated gaming wireless is close to wired. Bluetooth and inexpensive generic wireless receivers are noticeably worse.',
      },
    ],
    sources: [],
  },

  /* ---------------------------------------------------------------- travel */
  {
    slug: 'when-to-book-flights-for-the-best-price',
    title: 'When to book flights for the best price',
    categorySlug: 'travel',
    authorSlug: 'nadia-fenn',
    daysAgo: 14,
    testedOnBuild: null,
    qualityScore: 87,
    affectedBuilds: [],
    metaTitle: 'When to book flights for the best price',
    metaDescription:
      'There is no magic day of the week. What actually moves airfares, the booking windows that tend to work, and the tricks that do not.',
    quickAnswer:
      'There is no secret cheapest day to book. Prices are set by demand-based systems that adjust continuously. What reliably helps is booking a few months ahead for long-haul and several weeks for short-haul, being flexible about dates, and checking nearby airports.',
    body: `Airline pricing generates more folklore than almost any other consumer subject.
Most of it is wrong, and the parts that work are unglamorous.

## How fares are actually set

Airlines divide a cabin into **fare buckets** — blocks of seats at different
prices. Cheap buckets sell out first and the next one opens, so the price rises
in steps rather than smoothly.

Those systems adjust constantly based on how full a flight is relative to
expectations, historical demand for the route and date, competitor pricing, and
events driving demand.

Two consequences follow. Prices can fall as well as rise, if a flight is selling
worse than expected. And no fixed rule about days or times can capture a system
reacting continuously to demand.

## Booking windows that tend to work

Averages, not guarantees:

- **Short-haul** — roughly one to three months ahead.
- **Long-haul** — roughly two to six months ahead.
- **Peak periods** — school holidays, Christmas, major events — earlier, because
  demand is predictable and airlines have no reason to discount.

Very early booking is not automatically cheaper: airlines often open seats at
standard fares and adjust later. Very late booking is occasionally cheap on
routes with unsold capacity and expensive on everything else — a gamble, not a
strategy.

## What genuinely reduces the price

**Flexibility on dates.** The largest single factor. Mid-week departures are
usually cheaper than Friday and Sunday. Use the flexible-date grids the search
sites provide.

**Nearby airports.** Check alternatives at both ends, including the cost and time
of getting to them. A cheaper fare from a distant airport is not always cheaper
overall.

**Flying at unpopular times.** Early morning and late evening are consistently
less expensive.

**Booking each direction separately**, sometimes. Worth checking, but note that
separate tickets mean no protection if a delay on one makes you miss the other.

**Setting price alerts** rather than checking repeatedly. Search sites will watch
a route for you.

## What does not work

**"Book on a Tuesday."** This was loosely true decades ago when fares were filed
manually on a weekly cycle. Pricing is now continuous.

**Incognito mode to avoid price rises.** Repeatedly claimed, never
convincingly demonstrated. Fares change because inventory changes. If you want
to rule it out, compare in a private window — it costs nothing, and you will
usually find the same price.

**VPN to a cheaper country.** Occasionally produces a different currency price,
but frequently fails at payment when the card country does not match, and may
breach the airline's terms.

**Waiting for a last-minute collapse.** Rare on popular routes, and the downside
is a much more expensive ticket or no seat.

## Costs to check before comparing

A headline fare is not the price. Before deciding, confirm:

- **Baggage.** Cabin and checked allowances vary enormously, and added later they
  are expensive.
- **Seat selection**, if you need specific seats.
- **Payment card fees**, still applied by some carriers.
- **Airport transfer** costs at both ends.
- **Layover length.** A very short connection risks missing it; a very long one
  costs a day.

Budget carriers are often genuinely cheapest, and often not once the extras are
added. Compare the total.`,
    faq: [
      {
        question: 'Is there a cheapest day of the week to book flights?',
        answer:
          'No. That belief dates from when fares were filed manually on a weekly cycle. Modern pricing systems adjust continuously in response to demand.',
      },
      {
        question: 'Does searching in incognito mode get cheaper fares?',
        answer:
          'There is no convincing evidence for it. Prices change because seat inventory changes. Checking in a private window costs nothing if you want to rule it out.',
      },
      {
        question: 'How far in advance should I book?',
        answer:
          'Roughly one to three months for short-haul and two to six for long-haul, and earlier for peak holiday periods. These are averages rather than guarantees.',
      },
      {
        question: 'Are budget airlines actually cheaper?',
        answer:
          'Sometimes. Compare the total including baggage, seat selection and transport to often more distant airports, because the headline fare frequently excludes things included elsewhere.',
      },
    ],
    sources: [],
  },

  {
    slug: 'what-travel-insurance-actually-covers',
    title: 'What travel insurance actually covers',
    categorySlug: 'travel',
    authorSlug: 'nadia-fenn',
    daysAgo: 20,
    testedOnBuild: null,
    qualityScore: 86,
    affectedBuilds: [],
    metaTitle: 'What travel insurance actually covers',
    metaDescription:
      'Medical costs are the reason it exists. The exclusions that catch people out, and the questions to ask before buying.',
    quickAnswer:
      'The part that matters is emergency medical cover, which can run to very large sums abroad. Cancellation, baggage and delay cover are secondary. Most claim disputes come from undeclared pre-existing conditions, alcohol-related incidents, unattended possessions and activities excluded as hazardous.',
    body: `Travel insurance is bought quickly and read rarely, which is why so many people
discover its limits at the worst possible moment.

*This is general information, not advice on a specific policy. Read the policy
wording — it is the only thing that determines what you are covered for.*

## The part that actually matters

**Emergency medical cover.** Everything else is secondary.

Medical treatment abroad can be extremely expensive, and repatriation — being
flown home with medical support — costs far more than most people expect. This is
the risk that can be financially catastrophic, and it is the reason to hold a
policy at all.

Check the medical limit and confirm it includes repatriation.

## The other components

**Cancellation and curtailment.** Covers prepaid costs if you cannot travel, or
must return early, for a covered reason. Covered reasons are a defined list — not
simply changing your mind.

**Baggage.** Usually has a low per-item limit. Valuables often need declaring
separately, and electronics are commonly capped well below their replacement
cost.

**Travel delay.** Modest fixed payments after a threshold, typically several
hours.

**Personal liability.** For damage or injury you cause. Rarely used, occasionally
essential.

## The exclusions that catch people out

**Pre-existing medical conditions.** The single biggest cause of rejected claims.
Insurers require declaration of existing conditions, and an undeclared one can
void the claim — including for something apparently unrelated. Declare
everything, even if it raises the premium.

**Alcohol.** Most policies exclude incidents where alcohol was a contributing
factor. This is applied more broadly than travellers expect.

**Unattended possessions.** A bag left on a beach or beside a café chair is
generally not covered. "Unattended" tends to mean out of arm's reach.

**Hazardous activities.** Skiing, scuba diving, motorcycling — including mopeds,
which catches many people — climbing and many adventure sports usually require an
add-on. Riding a moped without the correct licence typically voids cover
entirely.

**Government travel advice.** Travelling against an official advisory commonly
voids the policy.

**Undeclared trip length or destination.** Cover is priced by region and
duration, and exceeding either can invalidate it.

## Practical points

**Buy it when you book, not before you fly.** Cancellation cover only works if
the policy exists when the reason to cancel arises.

**Check what you already have.** Some bank accounts and credit cards include
travel insurance, sometimes with conditions such as paying for the trip on that
card. It may be adequate — or may have low limits and no pre-existing condition
cover.

**Annual multi-trip versus single trip.** If you travel more than twice a year,
annual is often cheaper. Check the maximum trip length; many cap individual trips
at around 30 days.

**Keep documentation.** Emergency assistance number saved offline, policy number
accessible, and receipts and reports for anything you may claim. Many policies
require a police report for theft within a defined window.

**Call the emergency line before major treatment** where you are able to. Some
policies require prior authorisation for non-emergency treatment, and paying
first can complicate reimbursement.

## Reciprocal health agreements are not a substitute

Some countries have arrangements giving visitors access to state healthcare on
the same terms as residents. These are useful and worth having, but they
typically do not cover repatriation, private treatment, or costs residents also
pay. They complement insurance rather than replacing it.`,
    faq: [
      {
        question: 'When should I buy travel insurance?',
        answer:
          'When you book, not just before departure. Cancellation cover only applies if the policy is already in force when the reason to cancel arises.',
      },
      {
        question: 'Do I need to declare a medical condition that is under control?',
        answer:
          'Yes. Undeclared pre-existing conditions are the most common reason claims are refused, and non-disclosure can affect unrelated claims too.',
      },
      {
        question: 'Is my bag covered if it is stolen from a beach?',
        answer:
          'Usually not. Most policies exclude unattended possessions, and unattended is generally interpreted as out of arm’s reach.',
      },
      {
        question: 'Does standard insurance cover skiing or riding a moped?',
        answer:
          'Generally no. Both usually need an add-on, and riding a moped without the appropriate licence typically voids cover altogether.',
      },
    ],
    sources: [],
  },

  /* ------------------------------------------------------------- education */
  {
    slug: 'how-to-appeal-an-exam-result',
    title: 'How to appeal an exam result',
    categorySlug: 'education',
    authorSlug: 'priya-raghunathan',
    daysAgo: 17,
    testedOnBuild: null,
    qualityScore: 87,
    affectedBuilds: [],
    metaTitle: 'How to appeal an exam result',
    metaDescription:
      'Reviews of marking, deadlines, costs and the risk that a grade can go down. How the process works and when it is worth using.',
    quickAnswer:
      'Start by asking your school or institution about a review of marking — appeals almost always go through them, not directly from you. Deadlines are short and strict, there is usually a fee that is refunded if the grade changes, and in many systems a review can lower a grade as well as raise it.',
    body: `Results day appeals are time-pressured and procedural. Knowing the shape of the
process in advance saves the days that matter most.

*Exact rules, deadlines and terminology vary by country, awarding body and
institution. Treat this as the general shape and confirm the specifics with your
school or exam board.*

## Step 1: Get the marks broken down first

Before appealing anything, find out where the marks were actually lost.

Ask your school or college for a breakdown by question or component, and where
available, a copy of the marked script. Many boards provide these on request,
sometimes for a fee.

This matters because it changes the decision. A grade missed by one mark across
a paper is a very different case from one missed by twenty across several.

## Step 2: Understand what you are asking for

Most systems distinguish between:

- **A clerical check** — confirming marks were added correctly and none were
  missed. Cheap, quick, and worth requesting if anything looks inconsistent.
- **A review of marking** — an examiner checks whether the mark scheme was
  applied correctly. This is what most people mean by an appeal.
- **A formal appeal** — challenging the outcome of a review, usually on
  procedural grounds rather than academic judgement. This comes last, after a
  review, not instead of it.

Importantly, a review checks whether the mark scheme was **applied correctly**.
It is not a fresh opinion on the work, and disagreeing with the examiner's
judgement is not usually itself grounds for a change.

## Step 3: Go through your school

Requests are normally submitted by the school or college, not by candidates
directly. Contact the exams officer as early as possible — they handle many
requests in a short window and work to a queue.

Private candidates deal with the board directly, or through the centre where they
sat the exam.

## Step 4: Watch the deadlines

Deadlines after results are typically measured in weeks, and are firm.

**Priority deadlines** usually exist for candidates whose university or college
place depends on the outcome — these are shorter still, so say immediately if an
offer is at stake.

Missing the window generally ends the matter, regardless of the merits.

## The risk to weigh

In many systems **a reviewed mark can go down as well as up**. If the original
marking was generous, a review can correct that against you.

Consider the realistic prospect before proceeding:

- **Worth it** — a grade missed by a very small margin, an obvious inconsistency
  between components, or a paper where something went visibly wrong.
- **Think carefully** — a mark well inside a grade band, where a change large
  enough to matter is unlikely.

Ask the school's view. Teachers see the script and have seen many appeals, and
their read on whether a mark looks anomalous is genuinely useful.

## Costs

There is usually a fee per paper, commonly **refunded if the grade changes**. If
cost is a barrier, ask the school — many have hardship arrangements.

## If a place depends on it

Do these in parallel, not in sequence:

1. **Contact the university or college immediately.** Tell them a review is under
   way. Institutions frequently hold a place open pending the outcome, but only
   if they know.
2. **Request the priority review** through your school.
3. **Keep alternative options alive** — clearing, deferral or an alternative
   offer — until the outcome is confirmed.

## Separate issue: something went wrong on the day

If illness, bereavement or a problem in the exam room affected performance, that
is a different process — usually **special consideration** or **mitigating
circumstances**, and it has its own, often earlier, deadline. Raise it with the
school as soon as it happens rather than waiting for results.`,
    faq: [
      {
        question: 'Can my grade go down if I appeal?',
        answer:
          'In many systems, yes. A review can correct marking that was too generous as well as too harsh. Check whether that applies to your board before proceeding.',
      },
      {
        question: 'Can I appeal directly to the exam board myself?',
        answer:
          'Usually not. Requests normally go through the school or college that entered you. Private candidates deal with the board or the centre where they sat the exam.',
      },
      {
        question: 'How long do I have to appeal?',
        answer:
          'Typically a few weeks after results, with shorter priority deadlines where a university place depends on the outcome. The deadlines are firm, so act immediately.',
      },
      {
        question: 'Will I get the fee back?',
        answer:
          'Generally yes if the grade changes, and not if it stays the same. Schools often have support available where the fee is a barrier.',
      },
    ],
    sources: [GOV_UK_EDUCATION],
  },

  {
    slug: 'how-to-write-a-personal-statement',
    title: 'How to write a personal statement that is actually read',
    categorySlug: 'education',
    authorSlug: 'priya-raghunathan',
    daysAgo: 23,
    testedOnBuild: null,
    qualityScore: 86,
    affectedBuilds: [],
    metaTitle: 'How to write a personal statement',
    metaDescription:
      'Structure, evidence and the opening lines admissions tutors have read a thousand times. A practical method rather than platitudes.',
    quickAnswer:
      'Spend around 80% of the statement on academic interest in the subject and evidence that you have engaged with it beyond the syllabus, and the rest on relevant skills. Show specifics rather than claiming enthusiasm — what you read, what you thought, what you concluded. Avoid quotations and childhood anecdotes.',
    body: `A personal statement is not a personality test. It is an argument that you are
ready to study a specific subject, supported by evidence.

*Requirements vary by country and institution — some have moved to structured
questions rather than a single statement. Check the current format before you
start, and confirm length limits.*

## What the reader is looking for

Admissions tutors read enormous numbers of these under time pressure. They are
trying to answer:

1. Does this person understand what the course involves?
2. Have they engaged with the subject beyond what was required of them?
3. Can they think about it, rather than just list exposure to it?
4. Can they write clearly?

Everything in the statement should serve one of those.

## The proportion that works

Roughly **80% subject, 20% everything else**.

The most common failure is the reverse: a long account of a part-time job, sports
team or personal qualities, with the subject mentioned briefly. Those things
matter only where they connect to studying this subject.

## Show, do not claim

The difference between a weak and a strong statement is almost entirely here.

**Weak:** "I have always been passionate about economics and find it fascinating."

**Strong:** "Reading about behavioural economics made me question the rational
actor assumption I had accepted from my A-level course; I could not reconcile it
with how the people around me actually make decisions, which led me to..."

The first is a claim anyone can make. The second demonstrates reading,
reflection, and an idea the applicant actually holds. Never state enthusiasm —
demonstrate it and let the reader conclude it.

## A structure that works

**Opening (short).** Why this subject. Get to something specific immediately. No
throat-clearing, no dictionary definitions, no quotation.

**Main body (most of it).** Two to four paragraphs, each taking one piece of
engagement and doing something with it:

- What you encountered — a book, article, lecture, project, problem
- What you thought about it
- What question it left you with, or what it changed

Depth beats breadth. Two things discussed properly outperform eight listed.

**Relevant experience.** Work, volunteering or projects — but framed by what it
taught you that is relevant, not narrated chronologically.

**Brief close.** What you want from the course. Short and forward-looking.

## Openings to avoid

Every admissions tutor has read these many times:

- "From a young age I have always been fascinated by..."
- A dictionary definition of the subject
- A famous quotation, particularly Einstein
- A childhood anecdote about taking apart a radio
- "In today's ever-changing world..."

None is disqualifying. All waste the most valuable sentence you have.

## Practical process

1. **List everything** you have read, done, watched or built related to the
   subject. Do not filter yet.
2. **Pick the three or four** you can say something interesting about. Interest
   matters more than prestige — a well-considered response to an ordinary book
   beats a name-drop of a famous one.
3. **Write far too much**, then cut. Cutting from 150% to 100% produces much
   better writing than padding from 70%.
4. **Read it aloud.** Anything you stumble over needs rewriting.
5. **Have someone else read it** — ideally a teacher in the subject.
6. **Check the limit** in the units the system actually counts, whether
   characters or words, and whether spaces count.

## Two warnings

**Never copy anything.** Applications are checked against a large database of
previous statements, and similarity is detected and reported to institutions.

**Do not claim what you cannot discuss.** If you name a book, expect to be asked
about it at interview. Listing something you have not read is a bad trade.`,
    faq: [
      {
        question: 'How much should be about the subject?',
        answer:
          'Around 80%. Wider experience matters mainly where it connects back to studying this subject, and a statement dominated by unrelated activities is the most common weakness.',
      },
      {
        question: 'Should I start with a quotation?',
        answer:
          'Better not to. Quotations, dictionary definitions and childhood anecdotes are the most over-used openings and spend your most valuable sentence on someone else’s words.',
      },
      {
        question: 'Can I use the same statement for different courses?',
        answer:
          'In systems where one statement goes to several institutions, yes — but it must work for all of them, so keep it about the subject rather than any single course. Applying for very different subjects with one statement rarely works.',
      },
      {
        question: 'Will they check whether I read the books I mention?',
        answer:
          'Not directly, but interviews frequently start from what you named. Only include things you can genuinely discuss.',
      },
    ],
    sources: [GOV_UK_EDUCATION],
  },

  {
    slug: 'degree-apprenticeship-or-university',
    title: 'Degree apprenticeship or university: how to compare them',
    categorySlug: 'education',
    authorSlug: 'priya-raghunathan',
    daysAgo: 26,
    testedOnBuild: null,
    qualityScore: 85,
    affectedBuilds: [],
    metaTitle: 'Degree apprenticeship or university?',
    metaDescription:
      'Earning while studying against the full campus route. The trade-offs that actually matter, including the ones rarely mentioned.',
    quickAnswer:
      'A degree apprenticeship pays you and avoids tuition debt while you study for the same qualification, but the places are scarce, competitive, tied to one employer, and leave far less free time. University offers breadth, mobility and a wider subject choice at a higher financial cost.',
    body: `These are genuinely different routes to a similar qualification, and the right
answer depends on how you work and what you want.

*Availability, funding and terminology vary considerably by country. Check what
applies where you are before deciding.*

## What a degree apprenticeship is

You are employed, paid a salary, and study for a degree at the same time —
typically splitting time between work and study, with the employer or a training
levy covering tuition. You finish with the degree and several years of
experience, without tuition debt.

## The case for it

**No tuition debt, and income throughout.** Financially this is a substantial
difference over several years.

**Experience alongside the qualification.** You graduate with a work history,
which is exactly what graduates typically lack.

**A direct route into a role.** Many apprentices are retained by the employer,
and you have spent years demonstrating your work rather than interviewing on
potential.

**Learning in context.** For applied subjects — engineering, software, accounting
— seeing theory used immediately suits a lot of people better than studying it in
isolation.

## The case against it

**Scarcity and competition.** There are far fewer places than university places,
concentrated in particular sectors and locations. Application ratios are often
brutal, and you cannot count on getting one.

**Tied to one employer.** If the role, the sector or the organisation turns out
not to suit you, changing direction is much harder than changing a module.

**Much less free time.** You are working a job and studying for a degree
simultaneously. Holiday is annual leave, not university vacations. This is
consistently the thing apprentices say is underestimated.

**Narrower subject range.** Concentrated in a handful of fields. Many subjects
have no apprenticeship route at all.

**Less of the wider experience.** Moving away, meeting a wide range of people,
societies, and unstructured time to change your mind about what you want. Whether
that matters is personal, but it is real and often dismissed too quickly.

## The case for university

**Subject breadth** — including subjects with no apprenticeship equivalent.

**Mobility.** A degree not tied to one employer, and the option to move city or
country.

**Time to change direction.** Many people arrive intending one thing and leave
doing another. That flexibility has genuine value.

**Depth for its own sake**, which matters for research-oriented and academic
paths.

## Questions worth asking

**About an apprenticeship:**

- What proportion of apprentices are retained afterwards?
- Is study time genuinely protected, or expected around the job?
- Which institution awards the degree, and is it recognised where you might work?
- What happens if the employer makes redundancies partway through?

**About a course:**

- What do graduates from this specific course actually do?
- How much contact time, and how is it taught?
- What placement or industrial-year options exist? A placement year is a middle
  path that gets overlooked.

## The false framing

The comparison is often presented as "debt versus no debt", which oversimplifies
it. Student finance in many systems is repaid as an income-linked contribution
rather than a conventional loan, so the practical burden differs from the headline
figure. Look at how repayment actually works where you are.

The more useful question is not which is cheaper but **which suits how you
learn**. Some people need the structure and immediacy of applying knowledge at
work. Others need room to explore before committing. Both are legitimate, and
neither route is a lesser version of the other.`,
    faq: [
      {
        question: 'Is a degree apprenticeship the same qualification as a degree?',
        answer:
          'The degree is awarded by a university and is the same qualification. The difference is how you study for it and that you are employed and paid throughout.',
      },
      {
        question: 'Are degree apprenticeships easier to get into?',
        answer:
          'Generally the opposite. There are far fewer places than university places, so competition for popular schemes is often more intense.',
      },
      {
        question: 'What happens if I leave partway through an apprenticeship?',
        answer:
          'It depends on the agreement and how far you have progressed. Some completed stages carry credit, but there is no guarantee of transferring straight into a university course, so ask before committing.',
      },
      {
        question: 'Do employers value one over the other?',
        answer:
          'It varies by sector. In applied fields, the work experience from an apprenticeship is valued highly. In research-oriented and academic paths, the traditional route remains the norm.',
      },
    ],
    sources: [GOV_UK_EDUCATION],
  },
];
