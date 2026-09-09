import type { Database } from '../database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type SiteMonitor } from '../../state/types.js';

/**
 * Site status monitor persistence.
 */
export class MonitorRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  listMonitors(userId: number): SiteMonitor[] {
    return this.state.listMonitors(userId);
  }

  getMonitor(userId: number, id: number): SiteMonitor | null {
    return this.state.getMonitor(userId, id);
  }

  listMonitorsForAllUsers(): SiteMonitor[] {
    return this.state.allMonitors();
  }

  addMonitor(userId: number, name: string, url: string, webhookId: number | null): SiteMonitor {
    const result = this.db.raw
      .prepare('INSERT INTO site_status (user_id, name, url, webhook_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, name, url, webhookId, nowIso());
    const monitor: SiteMonitor = {
      id: Number(result.lastInsertRowid),
      userId,
      name,
      url,
      enabled: 1,
      status: 'unknown',
      lastCheckedAt: null,
      webhookId,
      createdAt: nowIso(),
    };
    this.state.putMonitor(monitor);
    return monitor;
  }

  updateMonitor(
    userId: number,
    id: number,
    fields: { name?: string; url?: string; webhookId?: number | null; enabled?: number },
  ): SiteMonitor | null {
    const current = this.state.getMonitor(userId, id);
    if (!current) return null;
    const updated: SiteMonitor = {
      ...current,
      name: fields.name ?? current.name,
      url: fields.url ?? current.url,
      webhookId: fields.webhookId ?? current.webhookId,
      enabled: fields.enabled ?? current.enabled,
    };
    this.db.raw
      .prepare('UPDATE site_status SET name = ?, url = ?, webhook_id = ?, enabled = ? WHERE id = ? AND user_id = ?')
      .run(updated.name, updated.url, updated.webhookId, updated.enabled, id, userId);
    this.state.putMonitor(updated);
    return updated;
  }

  setMonitorChecked(userId: number, id: number, status: string): void {
    const current = this.state.getMonitor(userId, id);
    if (!current) return;
    this.db.raw
      .prepare('UPDATE site_status SET status = ?, last_checked_at = ? WHERE id = ? AND user_id = ?')
      .run(status, nowIso(), id, userId);
    this.state.setMonitorStatus(id, status, nowIso());
  }

  deleteMonitor(userId: number, id: number): void {
    this.db.raw.prepare('DELETE FROM site_status WHERE id = ? AND user_id = ?').run(id, userId);
    this.state.deleteMonitor(id);
  }
}
