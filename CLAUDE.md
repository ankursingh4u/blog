# Project: FixDesk (working name) — general-interest trending blog

## What this is
A dynamic, SEO-first blog covering trending topics across eight verticals for a
broad general audience. Goal: organic traffic from Google Search + Google Discover.
Monetised later via self-managed display ad slots (no affiliate networks, no buy buttons).

The site began as a Windows-only fix-it blog and was broadened in September 2026.
That history matters in one place only: the Windows back-catalogue still lives at
/tech/windows and keeps its fix-it post structure. Do NOT narrow the site back to
Windows, and do not treat the Windows conventions below as the site-wide default.

## Current stage: LOCAL ONLY
- Everything runs on localhost. No hosting, no cloud DB, no auth yet.
- /admin is open (no login) for now. Design it so auth can be added later
  without restructuring (keep all admin routes under /admin and all admin
  server actions in src/lib/admin/).
- Screenshots and featured images are saved to /public/uploads/ for now.
  Abstract file storage behind src/lib/storage.ts so it can be swapped for
  Supabase Storage later.
- The daily pipeline runs via `npm run generate`, the "Run pipeline now" button in
  /admin, and a local scheduler (`npm run scheduler` — node-cron, runs daily at
  09:00 local time, splitting POSTS_PER_DAY posts a few hours apart so they look natural).
  When deployed, the same job moves to Vercel Cron hitting /api/cron/generate.

## Go-live (phase 5, after local build works)
- Deploy to Vercel, switch DATABASE_URL to Postgres (Supabase), connect the domain.
- Expose /api/cron/generate protected by CRON_SECRET; add vercel.json cron schedule.
- Add Google Search Console verification meta tag and GA4 ID from Settings.
- Wire the IndexNow key (Setting INDEXNOW_KEY) and serve /{key}.txt at the root.
- Submit /sitemap.xml in Search Console; ping sitemap on every publish.

## Stack (do not change without asking)
- Next.js 15 App Router, TypeScript, Tailwind
- SQLite via Prisma for local dev (schema must stay Postgres-compatible —
  no SQLite-only types; we will switch DATABASE_URL to Postgres/Supabase later)
- AI generation: OpenAI API, key in .env as OPENAI_API_KEY, model name in
  OPENAI_MODEL (currently gpt-5.5). Never hardcode keys. Switched from the
  Anthropic API on 2026-09-08 at the owner's request; src/lib/ai.ts is the only
  file that imports a provider SDK, so a future swap is confined to it.
  Note the GPT-5 family rejects `max_tokens` (use `max_completion_tokens`) and
  any non-default `temperature`, and strict structured outputs require every
  schema property to be in `required` — use `.nullable()`, never `.optional()`.
- Images: next/image; OG images via @vercel/og at /api/og

## Content categories (slugs are fixed — used in URLs, sitemap, and pipeline)
Eight top-level verticals:
1. tech            — phones, laptops, software, AI
2. entertainment   — film, TV, streaming, music
3. sports          — results, fixtures, transfers
4. money           — business, markets, personal finance
5. health          — fitness, nutrition, sleep, wellbeing
6. gaming          — console/PC games, hardware, patches
7. travel          — destinations, flights, visas, costs
8. education       — exams, admissions, courses, careers

Categories may nest ONE level via Category.parentId. The only sub-section today:
- windows (parent: tech) — the Windows back-catalogue at /tech/windows

URL shapes are derived in src/lib/urls.ts and nowhere else:
  /tech · /tech/windows · /tech/some-post · /tech/windows/some-post
Never build a category or post path by hand.

## Post structure
Required on EVERY post, in every vertical:
- H1 = target keyword phrased naturally
- "Quick answer" box (2–3 sentences) at the top
- H2 per section, written so the page is skimmable
- FAQ (3–5 Q&As, also emitted as FAQPage schema)
- Last-verified date + author
- Internal links to 3–5 related posts (auto-suggested, editor confirms)
- Sources listed at the bottom; every URL must resolve
  (`npx tsx scripts/check-sources.ts` checks the fixtures)

Additionally, for troubleshooting posts (the /tech/windows back-catalogue and any
future fix-it content):
- Affected versions / builds (structured field, shown as a badge)
- Numbered fix steps with an H2 per method: "Method 1: …", "Method 2: …",
  ordered least destructive first
- "If nothing worked" section
- "Tested on: [build]" line

`affectedBuilds` and `testedOnBuild` are optional and stay empty/null outside
troubleshooting content — the templates already hide them when unset.

## Authors
8 author profiles stored in DB: name, slug, avatar, bio, categoryFocus,
stylePrompt (used at generation time). Bios are honest — no fake credentials.
Posts are assigned round-robin among authors whose categoryFocus matches.
Every vertical must have at least one author whose categoryFocus covers it.

## Data model (Prisma)
- Author: id, name, slug, avatar, bio, categoryFocus (json array), stylePrompt, createdAt
- Category: id, name, slug, description, position, accent, parentId (self-relation,
  ONE level deep — a child may not have children)
- Post: id, title, slug, categoryId, authorId,
  status (DRAFT | REVIEW | APPROVED | PUBLISHED | ARCHIVED),
  quickAnswer, body (markdown), affectedBuilds (json array), faq (json),
  metaTitle, metaDescription, featuredImage, screenshots (json array),
  sourceUrls (json array), qualityScore, qualityNotes,
  generatedBy (AI | HUMAN), testedOnBuild, lastVerifiedAt, publishedAt, createdAt, updatedAt
- Keyword: id, phrase, categoryId, source (FEED | MANUAL), status (QUEUED | USED | SKIPPED), createdAt
- Setting: key, value

## Pipeline (src/pipeline)
1. Ingest: discover trending topics per vertical via src/pipeline/discovery.ts
   (Google Trends, Google News RSS, Google autocomplete — all topic-agnostic).
   For the windows sub-section, also fetch Microsoft release-health / Windows
   update history RSS and extract KB numbers, build numbers and error codes.
   Validate with Zod. Insert new Keyword rows (dedupe by phrase).
   Never fabricate an identifier, figure or date.

   NOTE (Sept 2026): discovery.ts is topic-agnostic and works today, but
   src/pipeline/ingest.ts still only carries the Windows feeds, so generation for
   the other seven verticals is not wired up yet. This is the next pipeline task.
2. Select: POSTS_PER_DAY keywords per run (default 2, max 3, in Settings); newest release first.
   Spread across categories — never 3 posts in the same category on one day.
3. Assign author: random pick among authors whose categoryFocus matches (no two consecutive
   posts by the same author).
4. Research: fetch 3–5 source URLs (official docs first), extract plain text,
   store in sourceUrls. The model may only state facts present in these sources.
5. Generate: Anthropic API call. System prompt = post structure above + author.stylePrompt.
   Output strict JSON: {title, slug, quickAnswer, body, affectedBuilds, faq,
   metaTitle, metaDescription, internalLinkSuggestions}. Strip fences, parse, validate.
6. Quality gate: second API call scoring 0–100 (accuracy vs sources, structure,
   thinness, hallucinated identifiers). Store score + notes.
7. Internal links: match suggestions to existing posts by category + title similarity.
8. Featured image: auto-generate a 1200x630 branded image via /api/og with the title.
9. Publish decision (Setting AUTO_PUBLISH, default false):
   - AUTO_PUBLISH=false → status REVIEW; human publishes from /admin.
   - AUTO_PUBLISH=true  → score ≥ 85 AND no hallucinated identifiers → PUBLISHED
     immediately (publishedAt = now, sitemap updated, IndexNow ping);
     score < 85 → REVIEW. Post shows "Verified: pending" until a human sets testedOnBuild.
   Every auto-published post is listed in the admin "Published today — verify" queue.

## Hard rules
- With AUTO_PUBLISH=false nothing goes live without a human clicking Publish.
- With AUTO_PUBLISH=true only posts that pass the quality gate go live; anything
  flagged for hallucinated identifiers is blocked regardless of score.
- Auto-published posts always carry a generated featured image; a human adds real
  screenshots and testedOnBuild afterwards from the "verify" queue.
- Never invent facts. For troubleshooting content that means identifiers (KB, build,
  error code) must come from the source feed. For every other vertical it means no
  invented figures, dates, prices, scores, quotes or study results — if it is not in
  a source, it does not go in the post.
- No raw HTML from AI output is rendered; markdown is sanitised.
- Keep Core Web Vitals green: no layout shift, LCP < 2.5s, images sized and lazy-loaded.

## SEO requirements (built in, not bolted on)
- Article + FAQPage + BreadcrumbList + Person (author) JSON-LD on every post
- Auto sitemap.xml (posts, categories, authors), robots.txt, canonical tags, RSS feed
- Meta title/description per post (generated, editable)
- max-image-preview:large; featured image ≥ 1200px wide (Discover)
- Clean URLs: /[category]/[slug], /author/[slug]
- IndexNow ping on publish (src/lib/indexing.ts) — stub it now, wire the key later

## Public pages
/ (home), /[category], /[category]/[slug], /author/[slug], /about, /contact,
/editorial-policy, /search, /feed.xml, /sitemap.xml, /robots.txt

## Admin pages (/admin, no auth for now)
Dashboard (counts by status, review queue) · Posts list with filters · Post editor
(markdown + live preview, all structured fields, screenshot upload, related-posts picker,
status buttons, "Regenerate section" per H2) · Authors CRUD · Keywords queue ·
Settings (ad slot HTML per placement, posts-per-run) · "Run pipeline now" button

## Conventions
- src/app for routes, src/components, src/lib (db, ai, seo, storage, indexing, admin), src/pipeline
- Server components by default; client components only for interactivity
- Zod for all external input; never trust feed or AI output without validation
- Unit tests for the parser, validator, and quality gate (Vitest)
- Commit after each phase; keep README updated with env vars and scripts

## Build order (one phase per session)
1. Scaffold + Prisma (SQLite) + seed (5 categories, 3 authors, 5 keywords) + /admin
2. Public site + all SEO + OG images + Lighthouse ≥ 95 on the post page
3. Pipeline + `npm run generate` + `npm run scheduler` + quality gate + AUTO_PUBLISH + tests
4. Polish: error handling/logging, sanitisation, README, list of anything unimplemented
5. Go-live (see section above) — only when asked

## Deferred (do not build until asked)
Auth for /admin · Supabase Storage · email subscribe · further sub-sections beyond
/tech/windows · two-level category nesting
