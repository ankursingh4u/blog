# FixDesk

An SEO-first blog covering trending topics across eight verticals — tech,
entertainment, sports, money, health, gaming, travel and education. Content is
drafted by an AI pipeline, scored by an automated quality gate, and published by
a human.

The site started as a Windows-only fix-it blog; that back-catalogue lives on as a
sub-section at `/tech/windows` and keeps its troubleshooting post structure.

**Live** at **https://favo.news**, self-hosted on Coolify. Postgres,
password-protected admin, daily Google News ingest on a cron.

---

## Quick start

The database is Postgres in every environment, development included. It used to
be SQLite locally, but the two engines disagree in ways that fail silently —
`contains` is case-insensitive on SQLite and case-sensitive on Postgres, so site
search behaved differently in production with nothing to signal it. One engine,
no divergence. You need a Postgres to run this at all; see
[Local database](#local-database) if you do not have one.

```bash
npm install
cp .env.example .env          # then add DATABASE_URL and OPENAI_API_KEY
npm run db:push               # create the schema
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

These are **development fixtures**, not pipeline output, and they are not what is
on the live site — the fixtures were deleted once real generation worked, and the
34 articles in production are all pipeline output. Each fixture is stamped
`Development fixture` in its quality notes, which is what
`scripts/delete-fixtures.ts` matches on; that marker is the only thing separating
them from hand-written articles, since both are `generatedBy: HUMAN`.

The Windows guides use only real, publicly documented error codes, builds and
KBs; the eight-vertical articles are evergreen explainers with no dated claims.
Every source URL is checked by `npx tsx scripts/check-sources.ts`.

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
| `npm run db:push` | Push the Prisma schema to whatever `DATABASE_URL` points at |
| `npx tsx scripts/export-data.ts` | Dump every post, category, author, keyword and setting to `data-export.json` |
| `npx tsx scripts/import-data.ts` | Restore a dump. Upserts by id, so relations survive and it is safe to re-run |
| `npm run db:seed` | Seed categories (incl. sub-sections), authors, keywords, settings |
| `npm run db:content` | 14 sample guides with images. `--no-images`, `--force` |
| `npm run db:reset` | Drop and re-seed |
| `npm run db:studio` | Prisma Studio |

---

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | A Postgres URL. Not SQLite — see [Quick start](#quick-start) |
| `NEXT_PUBLIC_SITE_URL` | yes | `http://localhost:3000` locally. Drives canonicals, OG URLs and the sitemap. Needed at **build** time, not just runtime |
| `NEXT_PUBLIC_SITE_NAME` | no | Defaults to `FixDesk` |
| `OPENAI_API_KEY` | for generation | The pipeline refuses to run without it; the rest of the site works fine |
| `OPENAI_MODEL` | no | Defaults to `gpt-5.5` |
| `ADMIN_PASSWORD` | yes in production | The single password for `/admin`. **Unset ⇒ `/admin` is closed entirely**, not open — an unprotected admin on a public host is worse than an unreachable one |
| `AUTH_SECRET` | recommended | Signs the session cookie. Falls back to `ADMIN_PASSWORD`, which ties session validity to it — changing the password then logs everyone out |
| `CRON_SECRET` | yes in production | Bearer token for `/api/cron/generate`. Unset ⇒ the route refuses everything |

`DATABASE_URL` and the two `NEXT_PUBLIC_*` values must be available during
`next build`, because the build pre-renders the article and author pages and
queries the database to do it. The rest are runtime-only.

Operational settings live in the database, not in env, so they can be changed
from `/admin/settings` without a deploy: `POSTS_PER_DAY`, `AUTO_PUBLISH`,
`QUALITY_THRESHOLD`, `SITE_TAGLINE`, the four ad slots, `GA4_ID`,
`GSC_VERIFICATION`, `INDEXNOW_KEY`.

---

## How the pipeline works

`src/pipeline/`, orchestrated by `run.ts`:

1. **Ingest** (`ingest.ts`) — Google News section and search feeds for all eight
   verticals across the India and US editions (India weighted 2:1), plus
   autocomplete and, for the `windows` sub-section only, the Microsoft
   release-health and update-history feeds. `parser.ts` turns items into keyword
   candidates, deduped on a unique `phrase`; only Windows candidates carry KB
   numbers, build numbers and error codes.
2. **Select** (`select.ts`) — takes `POSTS_PER_DAY` queued keywords, preferring
   those that arrived with a source URL, at most two per category per run.
   Keywords with no sourceable URL are skipped before any paid call.
3. **Assign author** — an author whose `categoryFocus` covers the category, never
   the same author twice in a row.
4. **Research** (`research.ts`) — fetches 3–5 sources and stores their text.
   Windows keywords get Microsoft documentation first; the other seven verticals
   get publisher RSS and an official-domain allow-list. Google News article links
   are dropped rather than fetched: they resolve to a JavaScript interstitial that
   never leaves `news.google.com`, so News is discovery-only.
5. **Generate** (`generate.ts`) — one OpenAI call using structured outputs, so
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
- **Author avatars are initials, not photographs.** Deliberate: the eight authors
  are fictional, and putting a real person's face to a fictional byline is
  misrepresentation. Add real photographs when the bylines belong to real people.
- **Search is a `LIKE` scan.** Fine at this corpus size. `searchPosts` in
  `src/lib/posts.ts` is the one place to swap for Postgres `tsvector`.
- **Lighthouse has not been run.** The build-time budget looks right and the CLS
  sources are controlled (every image box is reserved, ads reserve height, fonts
  use `next/font`), but no audit has been run against a populated site — do that
  once there is real content.
- **Generation costs roughly 16k tokens per article** (~7.2k in, ~8.8k out), and
  about 85% of the spend is output, most of it reasoning. The 34 articles now on
  the site were produced this way. Budget before running a large batch.
- **The scheduled run does not generate anything.** `/api/cron/generate` ingests
  only unless called with `?mode=generate`, deliberately: discovery is free,
  writing is not, and an unattended job that spends money cannot be supervised.
  Articles are written on demand from `/admin`.
- **`revalidatePath` is skipped in CLI runs.** `npm run generate` has no Next.js
  request context, so pages refresh on their own revalidate interval instead of
  immediately. Runs triggered from `/admin` revalidate properly.

---

## Deployment

Self-hosted on Coolify at `91.239.208.85`, in its own project (`FixDesk`),
isolated from everything else on that server.

| Resource | Notes |
| --- | --- |
| Application `fixdesk-web` | Nixpacks build from the public GitHub repo, branch `main`, port 3000 |
| Database `fixdesk-postgres` | Postgres, **not** publicly reachable. The app talks to it over the internal Docker network |
| Volume `uploads` → `/app/public/uploads` | A *named* volume, so Docker seeds it from the image on first mount and admin uploads survive redeploys |
| Scheduled task | `0 9 * * *`, calls `/api/cron/generate` over loopback inside the container |

Deploys are triggered by `POST /api/v1/deploy?uuid=<app>` against the Coolify API.

Two things about this host are worth knowing before debugging a failed build:

- **It cannot reach `fonts.googleapis.com`**, although npm and Google News work
  fine. That is why the fonts are checked into `src/app/fonts/` and loaded with
  `next/font/local` instead of `next/font/google` — the latter downloads at build
  time and failed here while succeeding locally.
- **`public/uploads` is committed to the repo**, unusually for an upload
  directory. The cover images are content, not build output; without them the
  container starts with every article missing its cover.

### Local database

There is no SQLite fallback any more. If you have Docker, any Postgres 16
container will do.

Without Docker, EnterpriseDB publishes a **binaries-only zip** that needs no
installer and no administrator rights — this is what the development machine
uses:

```bash
# One-off: download and unpack (~290 MB) from
# https://get.enterprisedb.com/postgresql/postgresql-16.6-1-windows-x64-binaries.zip
# then initialise a data directory:
C:/codershive/pgsql/bin/initdb -D C:/codershive/pgdata -U postgres --pwfile=<file> -E UTF8 --locale=C
```

```bash
# Start (port 5433, loopback only, so it cannot collide with anything):
C:/codershive/pgsql/bin/pg_ctl -D C:/codershive/pgdata -l C:/codershive/pgdata/server.log -o "-p 5433 -h 127.0.0.1" start

# Stop:
C:/codershive/pgsql/bin/pg_ctl -D C:/codershive/pgdata stop
```

Then `DATABASE_URL="postgresql://postgres:<password>@127.0.0.1:5433/fixdesk"`,
`npm run db:push`, and either `npm run db:seed` for an empty site or
`npx tsx scripts/import-data.ts` to load a dump of the live content.

Run `pg_ctl start` through a wrapper that does not hold its stdout open — `-w`
blocks the caller until the pipe closes, which looks like a hang even though the
server came up fine.

Do **not** point local development at the production database. It is not
publicly reachable by design, and anything changed locally would be published
immediately.

---

## Still to do

- **Search Console + GA4 + IndexNow.** Add the tokens in `/admin/settings`, then
  confirm `https://favo.news/{key}.txt` returns the IndexNow key and submit
  `/sitemap.xml`.
- **Mail for the contact addresses.** `corrections@`, `tips@` and `hello@favo.news`
  are published on /contact but no mailbox or forwarding exists yet, so anything
  sent there is currently lost. Namecheap's free email forwarding is enough.
- **`www` does not redirect.** Both `favo.news` and `www.favo.news` serve 200.
  Coolify's application `redirect: non-www` was set but the proxy did not pick it
  up on restart. Not urgent — every page served from `www` carries a canonical
  pointing at the apex, which is what search engines act on.
- **The old `sslip.io` hostname still resolves** and serves the same site. Kept
  deliberately as a way in if the domain or certificate ever breaks; its pages
  canonicalise to `favo.news`, so it will not be indexed separately.
- **`next@15.1.3` has a published vulnerability.** The install warns about it on
  every build. Upgrade to a patched 15.x.
- **Google Trends and the Windows feeds return nothing from this host** — the
  daily ingest is carried entirely by Google News and autocomplete
  (`bySource: {news, suggest}` are non-zero; `trends` and `feeds` are not).
  Worth checking whether those hosts are blocked from the server.
