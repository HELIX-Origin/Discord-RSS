import type { Logger } from './logger.js';
import { createLogger } from './logger.js';

export interface KeepAlivePingOptions {
  targetUrl: string;
  intervalMs?: number;
  logger?: Logger;
}

export class KeepAlivePing {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  readonly targetUrl: string;
  readonly intervalMs: number;
  private readonly logger: Logger;

  constructor(options: KeepAlivePingOptions) {
    this.targetUrl = options.targetUrl;
    this.intervalMs = options.intervalMs ?? 600_000; // 10 minutes default
    this.logger = options.logger ?? createLogger('keep-alive');
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.info(
      `Starting keep-alive network ping to ${this.targetUrl} every ${Math.round(this.intervalMs / 1000)}s`,
    );

    this.timer = setInterval(() => {
      void this.pingNow();
    }, this.intervalMs);
    this.timer.unref();

    // Trigger initial ping after a brief boot delay
    const initialDelay = setTimeout(() => {
      void this.pingNow();
    }, 5000);
    initialDelay.unref();
  }

  async pingNow(): Promise<boolean> {
    try {
      this.logger.debug(`Sending keep-alive ping to ${this.targetUrl}...`);
      const res = await fetch(this.targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'HelixRSS-KeepAlive/1.0',
          Accept: 'text/plain, application/json, */*',
        },
        signal: AbortSignal.timeout(10_000),
      });
      const ok = res.status >= 200 && res.status < 400;
      if (ok) {
        this.logger.debug(`Keep-alive ping successful (${res.status})`);
      } else {
        this.logger.warn(`Keep-alive ping responded with status ${res.status}`);
      }
      return ok;
    } catch (err) {
      this.logger.warn(`Keep-alive ping error: ${(err as Error).message}`);
      return false;
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info('Stopped keep-alive network ping');
  }
}
