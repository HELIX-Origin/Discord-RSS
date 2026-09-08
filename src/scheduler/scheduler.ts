import { createLogger, type LogLevel } from '../util/logger.js';

export type JobFn = () => Promise<void>;

export interface ScheduledJob {
  id: string;
  intervalMs: number;
  runNow(): Promise<void>;
}

export class Scheduler {
  private readonly jobs = new Map<string, { timer: NodeJS.Timeout | null; intervalMs: number; fn: JobFn }>();
  private started = false;
  private readonly logger;

  constructor(logLevel?: LogLevel) {
    this.logger = createLogger('scheduler', logLevel);
  }

  schedule(id: string, intervalMs: number, fn: JobFn): ScheduledJob {
    const job = {
      timer: null as NodeJS.Timeout | null,
      intervalMs,
      fn,
    };
    this.jobs.set(id, job);
    if (this.started) {
      job.timer = setInterval(() => void this.run(id), intervalMs);
      job.timer.unref?.();
    }
    return {
      id,
      intervalMs,
      runNow: () => this.run(id),
    };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const [id, job] of this.jobs) {
      job.timer = setInterval(() => void this.run(id), job.intervalMs);
      job.timer.unref?.();
    }
  }

  stop(): void {
    for (const job of this.jobs.values()) {
      if (job.timer) clearInterval(job.timer);
      job.timer = null;
    }
    this.started = false;
  }

  private async run(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    try {
      await job.fn();
    } catch (err) {
      this.logger.error('Scheduled job failed', { jobId: id }, err);
    }
  }
}
