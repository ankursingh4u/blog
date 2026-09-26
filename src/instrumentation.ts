/**
 * Brings the database up to date when the server starts.
 *
 * This project has no migrations directory — the schema is applied with
 * `prisma db push`, which needs a connection from a developer's machine. In
 * production the database is deliberately not reachable from outside the
 * Docker network, and the documented way round that was to make it public for
 * a few minutes. That is no longer an acceptable trade: the production
 * password is sitting in a public commit, so opening the port pairs an open
 * database with a credential anyone can read.
 *
 * So additive schema changes are applied here instead, from inside the
 * container that already has a connection. Every statement is idempotent and
 * nothing is ever dropped or altered, which is the only reason running DDL at
 * boot is defensible: the worst case is that it does nothing.
 *
 * This is a bootstrap, not a migration system. If the schema starts changing
 * in ways that are not purely additive, adopt `prisma migrate` properly rather
 * than growing this file.
 */
export async function register() {
  // `register` runs in the Edge runtime too, where Prisma and a TCP socket to
  // Postgres do not exist.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { prisma } = await import('@/lib/db');

  const statements = [
    // Slugs a post used to live at, so an edited headline does not 404 the URL
    // Google has indexed. See the PostSlug model in schema.prisma.
    `CREATE TABLE IF NOT EXISTS "PostSlug" (
       "slug"      TEXT NOT NULL,
       "postId"    TEXT NOT NULL,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "PostSlug_pkey" PRIMARY KEY ("slug")
     )`,
    `CREATE INDEX IF NOT EXISTS "PostSlug_postId_idx" ON "PostSlug"("postId")`,
    // Postgres has no ADD CONSTRAINT IF NOT EXISTS, so the duplicate is caught
    // rather than avoided.
    `DO $$ BEGIN
       ALTER TABLE "PostSlug"
         ADD CONSTRAINT "PostSlug_postId_fkey"
         FOREIGN KEY ("postId") REFERENCES "Post"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL;
     END $$`,
  ];

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      // A failure here must not stop the server from serving. The site works
      // without redirects; it does not work if it refuses to boot.
      console.error('[instrumentation] schema bootstrap failed:', error);
    }
  }
}
