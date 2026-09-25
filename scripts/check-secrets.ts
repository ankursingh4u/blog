/**
 * Refuses to let a credential reach the repo.
 *
 * Written after `db.tmp.json` — a throwaway file holding the live production
 * database URL, password and all — was committed to a public repository and sat
 * there for sixteen days. `.gitignore` had `*.tmp`, which does not match
 * `db.tmp.json`; the rule looked right and matched nothing.
 *
 * The lesson is that ignore rules fail silently, so this checks the thing that
 * actually matters — what is about to be committed — rather than trusting a
 * pattern to have worked. Run over the staged set by the pre-commit hook, and
 * over everything tracked by `npm run check:secrets`.
 *
 *   npx tsx scripts/check-secrets.ts            # every tracked file
 *   npx tsx scripts/check-secrets.ts --staged   # only what is staged
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

interface Rule {
  name: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    name: 'database URL with an embedded password',
    pattern: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:/@"']+:[^\s:/@"']+@/gi,
  },
  { name: 'OpenAI API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}/g },
  { name: 'Anthropic API key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { name: 'AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  // Coolify issues Sanctum tokens, which are "<id>|<40+ random chars>".
  { name: 'Coolify / Sanctum API token', pattern: /\b\d+\|[A-Za-z0-9]{40,}\b/g },
];

/**
 * Placeholders that are supposed to be in the repo. `.env.example` and the
 * README document the shape of every credential on purpose; flagging those
 * would train everyone to pass `--no-verify`, which is worse than no check.
 */
const PLACEHOLDER = /USER:PASSWORD|<password>|:password@|user:pass@|YOUR_|xxxx|example\.com|changeme|\bREPLACE\b/i;

/** Binary and lockfiles: nothing to read, and huge. */
const SKIP = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|pdf|zip|gz|mp4|webm|db|sqlite3?)$|(^|\/)package-lock\.json$/i;

function git(args: string[]): string[] {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

const staged = process.argv.includes('--staged');
const files = staged
  ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
  : git(['ls-files']);

interface Finding {
  file: string;
  line: number;
  rule: string;
  text: string;
}

const findings: Finding[] = [];

for (const file of files) {
  if (SKIP.test(file)) continue;

  let content: string;
  try {
    if (statSync(file).size > 2_000_000) continue;
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted, renamed away, or not readable as text
  }

  const lines = content.split('\n');
  for (const rule of RULES) {
    for (const match of content.matchAll(rule.pattern)) {
      const hit = match[0];
      if (PLACEHOLDER.test(hit)) continue;

      const line = content.slice(0, match.index ?? 0).split('\n').length;
      if (PLACEHOLDER.test(lines[line - 1] ?? '')) continue;

      findings.push({
        file,
        line,
        rule: rule.name,
        // Never print the credential itself — this output lands in terminal
        // scrollback and CI logs, which is how a leak gets a second life.
        text: `${hit.slice(0, 12)}… (${hit.length} chars)`,
      });
    }
  }
}

if (findings.length === 0) {
  console.log(`No credentials found in ${files.length} ${staged ? 'staged' : 'tracked'} files.`);
  process.exit(0);
}

console.error(`\nBlocked: ${findings.length} possible credential(s).\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    ${f.rule} — ${f.text}`);
}
console.error(`
Move the value into .env (which is ignored) and read it with process.env.
If this is genuinely a placeholder, make it look like one — USER:PASSWORD,
<password> or example.com are all recognised and skipped.

A secret that has already been pushed is public from that moment on. Removing
the file does not unpublish it: rotate the credential as well.
`);
process.exit(1);
