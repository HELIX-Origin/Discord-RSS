import type { Database } from './database.js';
import { AppState } from '../state/app-state.js';
import { nowIso, type ActivityEntry, type Feed, type OAuthConnection, type Session, type SiteMonitor, type User, type Webhook } from '../state/types.js';

export type { ActivityEntry, Feed, OAuthConnection, OAuthState, Session, SiteMonitor, User, Webhook } from '../state/types.js';

/**
 * Write-through persistence facade.
 *
 * Reads are served exclusively from the in-memory AppState (the primary
 * runtime layer); every mutation applies to AppState synchronously and then
 * persists through to SQLite underneath. Never read directly from the DB for
 * runtime data.
 */
export class Repository {
  readonly state: AppState;

  constructor(private readonly db: Database) {
    this.state = new AppState(db);
  }

  // ---- Users & auth ----

  createUser(email: string, passwordHash: string, displayName: string): User {
    const result = this.db.raw
      .prepare('INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)')
      .run(email, passwordHash, displayName, nowIso());
    const user: User = {
      id: Number(result.lastInsertRowid),
      email,
      passwordHash,
      displayName,
      createdAt: nowIso(),
    };
    this.state.putUser(user);
    return user;
  }

  getById(id: number): User | null {
    return this.state.getUserById(id);
  }

  getByEmail(email: string): User | null {
    return this.state.getUserByEmail(email);
  }

  getUserById(id: number): User | null {
    return this.state.getUserById(id);
  }

  createSession(userId: number, token: string, expiresAt: string): Session {
    const result = this.db.raw
      .prepare('INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(userId, token, nowIso(), expiresAt);
    const session: Session = {
      id: Number(result.lastInsertRowid),
      userId,
      token,
      createdAt: nowIso(),
      expiresAt,
    };
    this.state.putSession(session);
    return session;
  }

  getSessionByToken(token: string): Session | null {
    return this.state.getSessionByToken(token);
  }

  deleteSession(token: string): void {
    this.db.raw.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    this.state.deleteSession(token);
  }

  getUserBySessionToken(token: string): User | null {
    const session = this.state.getSessionByToken(token);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return this.state.getUserById(session.userId) ?? null;
  }

  // ---- OAuth connections ----

  oauthConnectionsFor(userId: number): OAuthConnection[] {
    return this.state.oauthConnectionsFor(userId);
  }

  getOAuthConnection(userId: number, provider: string): OAuthConnection | null {
    return this.state.getOAuthConnection(userId, provider);
  }

  upsertOAuthConnection(connection: {
    userId: number;
    provider: string;
    providerAccountId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
  }): void {
    this.db.raw
      .prepare(
        `INSERT INTO oauth_connections (user_id, provider, provider_account_id, access_token, refresh_token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, provider) DO UPDATE SET
           provider_account_id = excluded.provider_account_id,
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           expires_at = excluded.expires_at`,
      )
      .run(
        connection.userId,
        connection.provider,
        connection.providerAccountId,
        connection.accessToken,
        connection.refreshToken,
        connection.expiresAt,
        nowIso(),
      );
    this.state.putOAuthConnection({
      id: this.state.getOAuthConnection(connection.userId, connection.provider)?.id ?? 0,
      userId: connection.userId,
      provider: connection.provider,
      providerAccountId: connection.providerAccountId,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
      createdAt: nowIso(),
    });
  }

  deleteOAuthConnection(userId: number, provider: string): void {
    this.db.raw.prepare('DELETE FROM oauth_connections WHERE user_id = ? AND provider = ?').run(userId, provider);
    this.state.deleteOAuthConnection(userId, provider);
  }

  saveOAuthState(state: string, userId: number, provider: string): void {
    this.db.raw
      .prepare('INSERT OR REPLACE INTO oauth_states (state, user_id, provider, created_at) VALUES (?, ?, ?, ?)')
      .run(state, userId, provider, nowIso());
    this.state.putOAuthState({ state, userId, provider, createdAt: nowIso() });
  }

  consumeOAuthState(state: string): { userId: number; provider: string } | null {
    const entry = this.state.getOAuthState(state);
    if (!entry) return null;
    this.db.raw.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
    this.state.deleteOAuthState(state);
    return { userId: entry.userId, provider: entry.provider };
  }

  cleanupExpiredOAuthStates(maxAgeMs: number): void {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const expired = this.state.expireOAuthStates(cutoff);
    if (expired.length === 0) return;
    const stmt = this.db.raw.prepare('DELETE FROM oauth_states WHERE state = ?');
    for (const state of expired) stmt.run(state);
  }

  // ---- Feeds ----

  listFeeds(userId: number): Feed[] {
    return this.state.listFeeds(userId);
  }

  getFeed(userId: number, id: number): Feed | null {
    return this.state.getFeed(userId, id);
  }

  listFeedsForAllUsers(): Feed[] {
    return this.state.allFeeds();
  }

  addFeed(
    userId: number,
    name: string,
    url: string,
    webhookId: number | null,
    feedType: 'rss' | 'scrape',
    scrape: Feed['scrape'],
  ): Feed {
    if (feedType === 'scrape' && !scrape) {
      throw new Error('Scrape feeds require a scrape configuration');
    }
    const result = this.db.raw
      .prepare(
        `INSERT INTO feeds (user_id, name, url, webhook_id, feed_type, scrape_item, scrape_title, scrape_link, scrape_description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        name,
        url,
        webhookId,
        feedType,
        scrape && feedType === 'scrape' ? scrape.item : null,
        scrape && feedType === 'scrape' ? scrape.title : null,
        scrape && feedType === 'scrape' ? scrape.link : null,
        scrape && feedType === 'scrape' ? (scrape.description ?? null) : null,
        nowIso(),
      );
    const feed: Feed = {
      id: Number(result.lastInsertRowid),
      userId,
      name,
      url,
      webhookId,
      enabled: 1,
      feedType,
      scrape: scrape && feedType === 'scrape' ? scrape : null,
      lastEntryId: null,
      lastCheckedAt: null,
      createdAt: nowIso(),
    };
    this.state.putFeed(feed);
    return feed;
  }

  updateFeed(
    userId: number,
    id: number,
    fields: { name?: string; url?: string; webhookId?: number | null; enabled?: number },
  ): Feed | null {
    const current = this.state.getFeed(userId, id);
    if (!current) return null;
    const updated: Feed = {
      ...current,
      name: fields.name ?? current.name,
      url: fields.url ?? current.url,
      webhookId: fields.webhookId ?? current.webhookId,
      enabled: fields.enabled ?? current.enabled,
    };
    this.db.raw
      .prepare('UPDATE feeds SET name = ?, url = ?, webhook_id = ?, enabled = ? WHERE id = ? AND user_id = ?')
      .run(updated.name, updated.url, updated.webhookId, updated.enabled, id, userId);
    this.state.putFeed(updated);
    return updated;
  }

  setFeedChecked(userId: number, id: number, lastEntryId: string | null): void {
    const current = this.state.getFeed(userId, id);
    if (!current) return;
    const updated: Feed = { ...current, lastEntryId, lastCheckedAt: nowIso() };
    this.db.raw
      .prepare('UPDATE feeds SET last_checked_at = ?, last_entry_id = ? WHERE id = ? AND user_id = ?')
      .run(updated.lastCheckedAt, lastEntryId, id, userId);
    this.state.putFeed(updated);
  }

  deleteFeed(userId: number, id: number): void {
    this.db.raw.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').run(id, userId);
    this.state.deleteFeed(id);
  }

  isEntrySent(feedId: number, entryId: string): boolean {
    return this.state.isEntrySent(feedId, entryId);
  }

  markEntrySent(feedId: number, entryId: string): void {
    this.db.raw
      .prepare('INSERT OR IGNORE INTO sent_entries (feed_id, entry_id, sent_at) VALUES (?, ?, ?)')
      .run(feedId, entryId, nowIso());
    this.state.markEntrySent(feedId, entryId);
  }

  latestFeeds(userId: number, limit: number): Feed[] {
    return this.state
      .listFeeds(userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  // ---- Webhooks ----

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

  // ---- Status monitors ----

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

  // ---- Settings & activity ----

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