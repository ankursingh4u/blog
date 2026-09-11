# Build image for FixDesk / Favo News.
#
# Replaces the Nixpacks build, which reinstalled every dependency on every
# deploy. Nixpacks caches the npm *download* cache but still runs a full
# `npm ci`, which was roughly four minutes of an eleven minute build even when
# nothing in package-lock.json had changed.
#
# Here the install is its own layer keyed on the lockfile, so a deploy that
# touches only application code reuses it and skips the install entirely.
# Editing next.config.ts no longer re-resolves nixpkgs either, which on its own
# was adding six minutes.
#
# Debian slim rather than Alpine: Prisma's query engine wants glibc and OpenSSL,
# and musl builds are an avoidable class of problem for no real size saving once
# the standalone output is doing the trimming.

# ---------------------------------------------------------------- deps
FROM node:22-slim AS deps
WORKDIR /app

# Prisma's postinstall needs OpenSSL to pick a query-engine binary.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# The manifests, plus the Prisma schema: `npm ci` runs `prisma generate` as a
# postinstall and it reads schema.prisma, so a manifests-only context fails the
# install outright. Both change rarely, which is what keeps this layer cached
# across an application-code deploy.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------- build
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` prerenders the homepage, the category pages and the author pages,
# and every one of those queries the database — so the connection string has to
# be present at build time, not just at runtime. The two NEXT_PUBLIC values are
# inlined into the client bundle and are equally build-time.
ARG DATABASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
ENV DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------- runtime
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Standalone's server defaults to binding localhost, which inside a container
    # means nothing outside it can connect and the proxy sees a dead backend.
    HOSTNAME=0.0.0.0

# `public` carries the cover images and is also where the uploads volume mounts,
# so it is copied before the volume is attached and seeds it on first mount.
COPY --from=builder /app/public ./public

# The traced server bundle, then the static assets it serves. `.next/static` is
# deliberately outside the trace and has to be copied separately.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma's generated client and engine live outside the trace too.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# next/image optimisation needs sharp at runtime; it arrives transitively rather
# than as a direct dependency, so tracing does not always pick it up.
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp

EXPOSE 3000

CMD ["node", "server.js"]
