import type { Database } from '../database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type ActivityEntry } from '../../state/types.js';

/**
 * Settings & activity log persistence.
 */
export class SettingsRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  getSetting(key: string): string | null {
    return this.state.getSetting(key);
  }

  setSetting(key: string, value: string): void {
    this.db.raw
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value);
    this.state.setSetting(key, value);
  }

  logActivity(userId: number | null, level: string, source: string, message: string): void {
    const entry: ActivityEntry = { ts: nowIso(), userId, level, source, message };
    this.db.raw
      .prepare('INSERT INTO activity_log (ts, user_id, level, source, message) VALUES (?, ?, ?, ?, ?)')
      .run(entry.ts, userId, level, source, message);
    this.state.logActivity(entry);
  }

  recentActivity(limit: number): ActivityEntry[] {
    return this.state.recentActivity(limit);
  }
}
