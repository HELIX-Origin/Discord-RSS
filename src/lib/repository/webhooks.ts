import type { Database } from '../../db/database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type Webhook } from '../../state/types.js';

/**
 * Discord webhook persistence.
 */
export class WebhookRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  listWebhooks(userId: number): Webhook[] {
    return this.state.listWebhooks(userId);
  }

  getWebhook(userId: number, id: number): Webhook | null {
    return this.state.getWebhook(userId, id);
  }

  addWebhook(userId: number, name: string, url: string): Webhook {
    const result = this.db.raw
      .prepare('INSERT INTO webhooks (user_id, name, url, created_at) VALUES (?, ?, ?, ?)')
      .run(userId, name, url, nowIso());
    const webhook: Webhook = {
      id: Number(result.lastInsertRowid),
      userId,
      name,
      url,
      enabled: 1,
      createdAt: nowIso(),
    };
    this.state.putWebhook(webhook);
    return webhook;
  }

  updateWebhook(userId: number, id: number, fields: { name?: string; url?: string; enabled?: number }): Webhook | null {
    const current = this.state.getWebhook(userId, id);
    if (!current) return null;
    const updated: Webhook = {
      ...current,
      name: fields.name ?? current.name,
      url: fields.url ?? current.url,
      enabled: fields.enabled ?? current.enabled,
    };
    this.db.raw
      .prepare('UPDATE webhooks SET name = ?, url = ?, enabled = ? WHERE id = ? AND user_id = ?')
      .run(updated.name, updated.url, updated.enabled, id, userId);
    this.state.putWebhook(updated);
    return updated;
  }

  deleteWebhook(userId: number, id: number): void {
    this.db.raw.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?').run(id, userId);
    this.state.deleteWebhook(id);
  }
}
