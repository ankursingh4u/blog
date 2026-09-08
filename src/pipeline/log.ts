/**
 * Pipeline logging.
 *
 * Every run collects its lines in memory as well as writing them to stdout, so
 * /admin can show the transcript of the last "Run pipeline now" click without a
 * log shipper. Kept to the last 500 lines — this is a debugging aid, not
 * storage.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogLine {
  at: string;
  level: LogLevel;
  message: string;
}

const MAX_LINES = 500;
const lines: LogLine[] = [];

function write(level: LogLevel, message: string) {
  const line: LogLine = { at: new Date().toISOString(), level, message };
  lines.push(line);
  if (lines.length > MAX_LINES) lines.shift();

  const prefix = `[pipeline] ${message}`;
  if (level === 'error') console.error(prefix);
  else if (level === 'warn') console.warn(prefix);
  else console.info(prefix);
}

export const log = {
  info: (message: string) => write('info', message),
  warn: (message: string) => write('warn', message),
  error: (message: string) => write('error', message),
  /** Lines from the current process, newest last. */
  recent: (limit = 200): LogLine[] => lines.slice(-limit),
  reset: () => {
    lines.length = 0;
  },
};
