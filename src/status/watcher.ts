import type { Repository } from '../db/repository.js';
import type { RedisCoordinator } from '../state/redis.js';
import { fetchRaw } from '../feed/fetch.js';
import { feedEmbed, sendWebhook } from '../webhook/discord.js';
import { createLogger, type LogLevel } from '../util/logger.js';

type SiteStatus = 'online' | 'down' | 'unknown';

function classify(status: number): SiteStatus {
  return status >= 200 && status < 400 ? 'online' : 'down';
}

export class StatusWatcher {
  private readonly logger;

  constructor(
    private readonly repo: Repository,
    private readonly redis: RedisCoordinator | null = null,
    logLevel?: LogLevel,
  ) {
    this.logger = createLogger('status', logLevel);
  }

  async checkMonitor(userId: number, monitorId: number): Promise<void> {
    const monitor = this.repo.getMonitor(userId, monitorId);
    if (!monitor || monitor.enabled === 0) return;

    const lockKey = `monitor:${monitorId}`;
    if (this.redis && !(await this.redis.acquireLock(lockKey, 60_000))) {
      return; // another instance is checking this monitor
    }
    try {
      await this.checkMonitorLocked(userId, monitor);
    } finally {
      await this.redis?.releaseLock(lockKey);
    }
  }

  private async checkMonitorLocked(
    userId: number,
    monitor: { id: number; name: string; url: string; status: string; webhookId: number | null },
  ): Promise<void> {
    let newStatus: SiteStatus;
    let detail = '';

    try {
      const res = await fetchRaw(monitor.url, { maxBytes: 512 * 1024 });
      newStatus = classify(res.status);
      detail = `HTTP ${res.status} (${Math.round(res.durationMs)}ms)`;
    } catch (err) {
      newStatus = 'down';
      detail = err instanceof Error ? err.message : String(err);
      this.logger.warn('Monitor check request failed', { monitorId: monitor.id, monitorName: monitor.name, url: monitor.url }, err);
    }

    const previous = monitor.status as SiteStatus;
    this.repo.setMonitorChecked(userId, monitor.id, newStatus);

    if (previous !== 'unknown' && previous !== newStatus) {
      await this.notifyTransition(userId, monitor, previous, newStatus, detail);
    }
  }

  async checkAllMonitors(): Promise<void> {
    const monitors = this.repo.listMonitorsForAllUsers().filter((m) => m.enabled === 1);
    await Promise.all(monitors.map((m) => this.checkMonitor(m.userId, m.id)));
  }

  private async notifyTransition(
    userId: number,
    monitor: { name: string; url: string; webhookId: number | null },
    previous: string,
    current: string,
    detail: string,
  ): Promise<void> {
    const webhook = monitor.webhookId ? this.repo.getWebhook(userId, monitor.webhookId) : null;
    if (!webhook || webhook.enabled === 0) return;

    const isDown = current === 'down';
    const title = isDown ? `⛔ ${monitor.name} went down` : `✅ ${monitor.name} is back online`;
    const description = `${monitor.url}\n\n${detail}`;

    const embed = feedEmbed({
      title,
      url: monitor.url,
      description,
      feedTitle: 'Site Status Monitor',
      color: isDown ? 0xef4444 : 0x22c55e,
    });

    const result = await sendWebhook(webhook.url, {
      username: 'Status Monitor',
      embeds: [embed],
    });

    if (!result.ok) {
      this.logger.warn('Status transition notification failed', {
        monitorName: monitor.name,
        url: monitor.url,
        previous,
        current,
        attempts: result.attempts,
        error: result.error,
      });
    } else {
      this.logger.info('Status transition notified', { monitorName: monitor.name, url: monitor.url, previous, current });
    }
  }
}