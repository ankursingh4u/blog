/**
 * Starts and stops the local PostgreSQL this project talks to.
 *
 *   npm run db:start
 *   npm run db:stop
 *   npm run db:status
 *
 * There is a Postgres on this machine — an EnterpriseDB binaries-only unzip,
 * documented under "Local database" in the README — but nothing starts it at
 * boot. When it is down every page of the site returns 500 from the root
 * layout, and the error says only `Can't reach database server at
 * 127.0.0.1:5433`, which reads like a configuration problem rather than a
 * stopped service. That cost an afternoon once; this script is the answer to
 * it being obvious in hindsight and invisible at the time.
 *
 * Paths come from the environment so this is not tied to one machine:
 *   PG_BIN    directory holding pg_ctl (default: C:/codershive/pgsql/bin)
 *   PGDATA    the data directory       (default: C:/codershive/pgdata)
 * The port is read from DATABASE_URL, so the two cannot drift apart.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const PG_BIN = process.env.PG_BIN ?? 'C:/codershive/pgsql/bin';
const PGDATA = process.env.PGDATA ?? 'C:/codershive/pgdata';

function port(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return '5433';
  try {
    return new URL(url).port || '5432';
  } catch {
    return '5433';
  }
}

function executable(): string {
  const exe = path.join(PG_BIN, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  if (!existsSync(exe)) {
    console.error(
      `No pg_ctl at ${exe}.\n` +
        'Set PG_BIN to the directory that holds it, or see "Local database" in the README.',
    );
    process.exit(1);
  }
  return exe;
}

function pgCtl(args: string[]): number {
  const result = spawnSync(executable(), args, { stdio: 'inherit' });
  return result.status ?? 1;
}

/** Resolves once something is listening, or after `seconds` either way. */
async function listening(on: number, seconds = 25): Promise<boolean> {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = net
        .connect({ port: on, host: '127.0.0.1' })
        .on('connect', () => {
          socket.destroy();
          resolve(true);
        })
        .on('error', () => resolve(false));
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (open) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const action = process.argv[2] ?? 'start';

  if (action !== 'start') {
    if (action === 'stop') process.exit(pgCtl(['-D', PGDATA, 'stop']));
    if (action === 'status') process.exit(pgCtl(['-D', PGDATA, 'status']));
    console.error(`Unknown action "${action}". Use start, stop or status.`);
    process.exit(1);
  }

  /**
   * Detached, with its output thrown away, because `pg_ctl start` does not
   * return while anything holds the stdout it inherited — on Windows the
   * server is up and serving requests while the command that started it hangs
   * forever, which is indistinguishable from a failure to start. `-l` sends
   * the server's own output to the log file, so nothing is lost by discarding
   * the pipe; whether it worked is then decided by the port, not by pg_ctl.
   */
  const args = [
    '-D',
    PGDATA,
    '-l',
    path.join(PGDATA, 'server.log'),
    '-o',
    `-p ${port()} -h 127.0.0.1`,
    'start',
  ];

  if (process.platform === 'win32') {
    /**
     * Handed to PowerShell rather than spawned directly.
     *
     * Node's `detached: true` is not enough on Windows: the server it leaves
     * behind still dies with the console that launched it, so Postgres would
     * quietly stop the moment the terminal running `npm run db:start` closed —
     * the failure this script exists to prevent, arriving later instead.
     * `Start-Process` creates a genuinely independent process that outlives it.
     */
    /**
     * `-o "-p 5433 -h 127.0.0.1"` needs its inner double quotes kept.
     * `Start-Process` splits an argument containing spaces unless the quotes
     * survive into the command line it builds, and pg_ctl then reads `-p` as
     * its own flag, fails, and writes the complaint to a hidden window nobody
     * sees — the port simply never opens.
     */
    const quoted = args
      .map((a) => (a.includes(' ') ? `'"${a}"'` : `'${a.replace(/'/g, "''")}'`))
      .join(',');
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Start-Process -FilePath '${executable()}' -ArgumentList ${quoted} -WindowStyle Hidden`,
      ],
      { stdio: 'ignore' },
    );
  } else {
    const child = spawn(executable(), args, { stdio: 'ignore', detached: true });
    child.unref();
  }

  const up = await listening(Number(port()));
  if (up) {
    console.log(`Postgres is up on 127.0.0.1:${port()}.`);
    process.exit(0);
  }
  console.error(
    `Postgres did not come up on 127.0.0.1:${port()}.\n` +
      `Last lines of ${path.join(PGDATA, 'server.log')} will say why.`,
  );
  process.exit(1);
}

void main();
