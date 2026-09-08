# FixDesk

An SEO-first blog covering trending topics across eight verticals — tech,
entertainment, sports, money, health, gaming, travel and education. Content is
drafted by an AI pipeline, scored by an automated quality gate, and published by
a human.

The site started as a Windows-only fix-it blog; that back-catalogue lives on as a
sub-section at `/tech/windows` and keeps its troubleshooting post structure.

Currently **local only** — SQLite, no auth, no hosting.

---

## Quick start

```bash
npm install
cp .env.example .env          # then add OPENAI_API_KEY
npm run db:push               # create the SQLite schema
npm run db:seed               # 8 verticals + windows sub-section, 8 authors, keywords, settings
npm run dev                   # http://localhost:3000
```

The site works immediately with zero posts. To fill it with sample content before
spending an API call:

```bash
npm run db:content        # 53 sample articles across every section, with images
```

Each guide gets a photograph downloaded from Unsplash and stored in
`public/uploads/covers/`, so the running site has no external image dependency.
If a download fails the script falls back to the branded `/api/og` card. Use
`--no-images` to skip image work entirely, or `--force` to rewrite existing posts.

These are **development fixtures**, not pipeline output. The Windows guides use
only real, publicly documented error codes, builds and KBs; the eight-vertical
articles are evergreen explainers with no dated claims. Every source URL is
checked by `npx tsx scripts/check-sources.ts`. Each post says so in its quality
notes. Delete them from `/admin/posts` before launch.

### Theme

The site defaults to **light**. The system preference is deliberately not
consulted, so a first-time reader always lands on the surface the article images
were designed against. Dark is one click away in the header and remembered after
that.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | `prisma generate` then a production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint via `next lint` |
| `npm test` | Vitest — parser, validator, quality gate, markdown |
| `npm run generate` | One pipeline run. `--skip-ingest`, `--limit=N` |
| `npm run scheduler` | Daily run at 09:00 local, spread a few hours apart. `--now` to also run immediately |
| `npm run db:push` | Push the Prisma schema to SQLite |
| `npm run db:seed` | Seed categories (incl. sub-sections), authors, keywords, settings |
| `npm run db:content` | 14 sample guides with images. `--no-images`, `--force` |
| `npm run db:reset` | Drop and re-seed |
| `npm run db:studio` | Prisma Studio |

---

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` locally. Swap for a Postgres URL at go-live |
| `NEXT_PUBLIC_SITE_URL` | yes | `http://localhost:3000` locally. Drives canonicals, OG URLs and the sitemap |
| `NEXT_PUBLIC_SITE_NAME` | no | Defaults to `FixDesk` |
| `OPENAI_API_KEY` | for generation | The pipeline refuses to run without it; the rest of the site works fine |
| `OPENAI_MODEL` | no | Defaults to `gpt-5.5` |
| `CRON_SECRET` | go-live only | Bearer token for `/api/cron/generate`. Unset ⇒ the route returns 503 |

Operational settings live in the database, not in env, so they can be changed
from `/admin/settings` without a deploy: `POSTS_PER_DAY`, `AUTO_PUBLISH`,
`QUALITY_THRESHOLD`, `SITE_TAGLINE`, the four ad slots, `GA4_ID`,
`GSC_VERIFICATION`, `INDEXNOW_KEY`.

---

## How the pipeline works

`src/pipeline/`, orchestrated by `run.ts`:

1. **Ingest** (`ingest.ts`) — polls Microsoft release-health, Windows Insider and
   Windows IT Pro feeds. **Still Windows-only**: `discovery.ts` already pulls
   topic-agnostic Google Trends / News / autocomplete signals, but ingest has not
   been wired to them, so generation for the other seven verticals is not live
   yet. `parser.ts` extracts KB numbers, build numbers and error
   codes and turns them into keyword candidates, deduped on a unique `phrase`.
2. **Select** (`select.ts`) — takes `POSTS_PER_DAY` queued keywords, newest first,
   at most two per category per run.
3. **Assign author** — an author whose `categoryFocus` covers the category, never
   the same author twice in a row.
4. **Research** (`research.ts`) — fetches 3–5 sources, Microsoft documentation
   first, and stores their text.
5. **Generate** (`generate.ts`) — one Anthropic call using structured outputs, so
   the response shape is enforced server-side. No fence-stripping, no JSON repair.
6. **Quality gate** (`quality-gate.ts`) — two checks, in order:
   - a **deterministic** scan for identifiers that appear nowhere in the sources;
   - a model-scored review of accuracy, structure, usefulness and safety.
7. **Internal links** (`internal-links.ts`) — matches the generator's suggestions
   to real published posts, topped up from the same category.
8. **Featured image** (`featured-image.ts`) — renders the 1200×630 card from
   `/api/og` and stores the bytes.
9. **Publish decision** — see below.

### The publish rule

With `AUTO_PUBLISH=false` (the default) **nothing** goes live without a human
clicking Publish.

With `AUTO_PUBLISH=true` a post publishes only when **all** of these hold:

- the identifier audit found nothing hallucinated,
- the quality score is at or above `QUALITY_THRESHOLD`,
- a featured image exists.

**The identifier audit is not overridable.** A draft naming a KB number, build or
error code absent from its sources is held for review at any score. That check is
pure string comparison in `auditIdentifiers` — no model is asked to adjudicate
it, so it cannot be argued out of its answer. It is covered by 11 tests.

Auto-published posts carry **"Verification pending"** until a human records a
tested build. They appear in the "Published today — verify" queue on `/admin`.

---

## Project layout

```
src/
  app/                    routes (App Router)
    [category]/[slug]/    the article page
    admin/                dashboard, posts, editor, authors, keywords, settings
    api/og/               1200×630 OG card (edge)
    api/cron/generate/    go-live cron entry point
  components/
    ui/                   the 7 ported design components + primitives
    admin/                admin-only components
    home/                 homepage sections
    article/              article-page parts
  lib/                    db, ai, seo, storage, indexing, markdown, settings, posts
    admin/                server actions (every write lives here)
  pipeline/               the nine steps above
  hooks/                  motion + viewport hooks
prisma/                   schema + seed
scripts/                  generate, scheduler, sample post
tests/                    Vitest
```

---

## Design components

Seven components were supplied as a design brief and ported into
`src/components/ui/`. Each file's header comment records what changed and why.
The substantive adaptations:

| Component | Change |
| --- | --- |
| `aether-flow-hero` | Sizes to its container rather than `window`; particle count capped (the link pass is O(n²)); stops when off-screen or the tab is hidden; static frame under reduced motion |
| `dynamic-frame-layout` | Generalised from video-only to image/video/node; decorative frame sprites optional; collapses to one column below `md` |
| `sticky-scroll-reveal` | Theme tokens instead of hard-coded slate; inactive steps fade to 0.55 not 0.3 so they stay legible; renders as a plain list under reduced motion |
| `container-scroll-animation` | Height is a prop; theme-token chrome; `matchMedia` hook instead of a resize listener |
| `scroll-expansion-hero` | **Rebuilt.** The reference `preventDefault()`s every wheel event and forces `scrollTo(0,0)` until its animation finishes, which traps keyboard and screen-reader users with no way out. Same visual, driven by a sticky container's own scroll progress instead |
| `gravity` | Dropped `svg-path-commander`, `poly-decomp` and `lodash` (~150 KB of client JS for a decorative effect, and a CommonJS `require` that does not resolve under the App Router); added a non-dragging mode so the falling chips can be real links; runs only while on-screen |
| `portfolio-hero` | Split into `blur-text` + `profile-hero`. The name is a real `<h1>` (the reference had no heading at all), the avatar is `next/image`, and the inline `fonts.googleapis.com` `<link>` is gone |

All seven respect `prefers-reduced-motion`, and the physics section is
code-split so Matter.js is only fetched when someone scrolls to it.

---

## SEO

- `TechArticle` + `FAQPage` + `BreadcrumbList` + `Person` JSON-LD on every post;
  `Organization` + `WebSite` + `SearchAction` site-wide — one `@graph` per page
- `sitemap.xml` (posts, categories, authors, with image entries), `robots.txt`,
  `feed.xml`, canonical tags on everything
- `max-image-preview:large` for Google Discover
- Per-post meta title/description, generated and editable, with live character
  counts and a SERP preview in the editor
- Clean URLs: `/[category]/[slug]`, `/author/[slug]`
- IndexNow ping on publish; the key file is served from the root via a rewrite

Search-result pages are `noindex, follow` — thin, near-duplicate, and not
something you want competing with the articles.

---

## Verified

- `npm run build` — clean
- `npm run typecheck` — clean
- `npm run lint` — no warnings or errors
- `npm test` — 69 tests passing
- Every route returns the expected status, including a real 404 on an unknown slug
- Article page emits all four required JSON-LD types
- `/api/og` returns a 1200×630 PNG
- First Load JS: 122 kB on the article page, 170 kB on the homepage

---

## Not implemented

Deliberately deferred, per the build plan:

- **Auth for `/admin`.** It is completely open. `robots.txt` disallows it and the
  layout sets `noindex`, but neither is access control — do not deploy this
  publicly as-is. Everything that writes is already funnelled through
  `src/lib/admin/actions.ts`, so a single wrapper there will cover every mutation.
- **Supabase Storage.** `src/lib/storage.ts` is the seam; only `put` and `remove`
  need reimplementing.
- **Further sub-sections** beyond `/tech/windows`, and two-level nesting.
- **Email subscribe.**
- **A contact form.** `/contact` lists addresses instead — a form needs spam
  handling and a mail transport, neither of which exists locally.

Known gaps worth naming:

- **Placeholder assets.** `/about` uses two Unsplash photographs, `/contact` lists
  `example.com` addresses, and the sample guides use stock photography for their
  featured images. All marked in-file. Replace before launch — real screenshots
  from the machine a fix was tested on are worth far more than stock photos, and
  the editor has a screenshot uploader for exactly that.
- **Author avatars are initials, not photographs.** Deliberate: the three authors
  are fictional, and putting a real person's face to a fictional byline is
  misrepresentation. Add real photographs when the bylines belong to real people.
- **Search is a `LIKE` scan.** Fine at this corpus size. `searchPosts` in
  `src/lib/posts.ts` is the one place to swap for Postgres `tsvector`.
- **Lighthouse has not been run.** The build-time budget looks right and the CLS
  sources are controlled (every image box is reserved, ads reserve height, fonts
  use `next/font`), but no audit has been run against a populated site — do that
  once there is real content.
- **The pipeline has not been run end-to-end against the live API.** Every step
  is unit-tested or manually exercised, and the structured-output contract means
  a malformed response is rejected at the API layer, but no full run has been
  billed. Start with `npm run generate --limit=1` and read the output.
- **`revalidatePath` is skipped in CLI runs.** `npm run generate` has no Next.js
  request context, so pages refresh on their own revalidate interval instead of
  immediately. Runs triggered from `/admin` revalidate properly.

---

## Go-live checklist

1. Deploy to Vercel; point `DATABASE_URL` at Supabase Postgres and change
   `provider` in `prisma/schema.prisma` to `postgresql`. No model changes are
   needed — the JSON columns are already stored as `String`.
2. Set `NEXT_PUBLIC_SITE_URL` to the real domain.
3. Set `CRON_SECRET` and add a `vercel.json` cron hitting `/api/cron/generate`.
4. Add the Search Console token and GA4 ID in `/admin/settings`.
5. Generate an IndexNow key and paste it into `/admin/settings`; confirm
   `https://yourdomain/{key}.txt` returns the key.
6. Submit `/sitemap.xml` in Search Console.
7. **Add auth to `/admin` before the deployment is publicly reachable.**
