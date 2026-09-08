export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function defaultLevel(): LogLevel {
  const env = process.env['DISCORD_RSS_LOG_LEVEL']?.toLowerCase();
  if (env && env in LEVELS) return env as LogLevel;
  return 'info';
}

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  private readonly level: number;

  constructor(
    private readonly source: string,
    level?: LogLevel,
  ) {
    this.level = LEVELS[level ?? defaultLevel()];
  }

  private log(level: LogLevel, message: string, context?: LogContext, err?: unknown): void {
    if (LEVELS[level] < this.level) return;

    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      source: this.source,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (err instanceof Error) {
      entry.error = { message: err.message, name: err.name, stack: err.stack };
    } else if (err !== undefined) {
      entry.error = String(err);
    }

    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, err?: unknown): void {
    this.log('warn', message, context, err);
  }

  error(message: string, context?: LogContext, err?: unknown): void {
    this.log('error', message, context, err);
  }
}

export function createLogger(source: string, level?: LogLevel): Logger {
  return new Logger(source, level);
}
