import { describe, expect, it, vi } from 'vitest';
import { Scheduler } from '../../../src/scheduler/scheduler.js';

describe('Scheduler', () => {
  it('schedules and executes a job with runNow', async () => {
    const scheduler = new Scheduler('error');
    let executed = 0;
    const job = scheduler.schedule('test-job', 1000, async () => {
      executed += 1;
    });

    expect(job.id).toBe('test-job');
    expect(job.intervalMs).toBe(1000);
    await job.runNow();
    expect(executed).toBe(1);
    scheduler.stop();
  });

  it('reschedules a job dynamically with new interval', () => {
    vi.useFakeTimers();
    try {
      const scheduler = new Scheduler('error');
      let count = 0;
      scheduler.schedule('counter', 10_000, async () => {
        count += 1;
      });
      scheduler.start();

      // Advance by 10s -> runs once
      vi.advanceTimersByTime(10_000);
      expect(count).toBe(1);

      // Reschedule to 5s
      scheduler.reschedule('counter', 5000);

      // Advance by 5s -> runs again
      vi.advanceTimersByTime(5000);
      expect(count).toBe(2);

      scheduler.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
