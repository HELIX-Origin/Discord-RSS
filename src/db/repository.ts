import type { Database } from './database.js';
import { AppState } from '../state/app-state.js';
import { UserRepository } from './repos/users.js';
import { OAuthRepository } from './repos/oauth.js';
import { FeedRepository } from './repos/feeds.js';
import { WebhookRepository } from './repos/webhooks.js';
import { MonitorRepository } from './repos/monitors.js';
import { SettingsRepository } from './repos/settings.js';
import type { ActivityEntry, Feed, OAuthConnection, Session, SiteMonitor, User, Webhook } from '../state/types.js';

export type {
  ActivityEntry,
  Feed,
  OAuthConnection,
  OAuthState,
  Session,
  SiteMonitor,
  User,
  Webhook,
} from '../state/types.js';

/**
 * Write-through persistence facade.
 *
 * Reads are served exclusively from the in-memory AppState (the primary
 * runtime layer); every mutation applies to AppState synchronously and then
 * persists through to SQLite underneath. Never read directly from the DB for
 * runtime data.
 *
 * This facade composes focused repositories from `repos/`, so each domain
 * collection below delegates to the appropriate module while keeping a single
 * entry point for the rest of the application.
 */
export class Repository {
  readonly state: AppState;
  private readonly users: UserRepository;
  private readonly oauth: OAuthRepository;
  private readonly feeds: FeedRepository;
  private readonly webhooks: WebhookRepository;
  private readonly monitors: MonitorRepository;
  private readonly settings: SettingsRepository;

  constructor(private readonly db: Database) {
    this.state = new AppState(db);
    this.users = new UserRepository(db, this.state);
    this.oauth = new OAuthRepository(db, this.state);
    this.feeds = new FeedRepository(db, this.state);
    this.webhooks = new WebhookRepository(db, this.state);
    this.monitors = new MonitorRepository(db, this.state);
    this.settings = new SettingsRepository(db, this.state);
  }

  // ---- Users & auth ----

  createUser(email: string, passwordHash: string, displayName: string): User {
    return this.users.createUser(email, passwordHash, displayName);
  }

  getById(id: number): User | null {
    return this.users.getById(id);
  }

  getByEmail(email: string): User | null {
    return this.users.getByEmail(email);
  }

  getUserById(id: number): User | null {
    return this.users.getUserById(id);
  }

  createSession(userId: number, token: string, expiresAt: string): Session {
    return this.users.createSession(userId, token, expiresAt);
  }

  getSessionByToken(token: string): Session | null {
    return this.users.getSessionByToken(token);
  }

  deleteSession(token: string): void {
    this.users.deleteSession(token);
  }

  getUserBySessionToken(token: string): User | null {
    return this.users.getUserBySessionToken(token);
  }

  // ---- OAuth connections ----

  oauthConnectionsFor(userId: number): OAuthConnection[] {
    return this.oauth.oauthConnectionsFor(userId);
  }

  getOAuthConnection(userId: number, provider: string): OAuthConnection | null {
    return this.oauth.getOAuthConnection(userId, provider);
  }

  upsertOAuthConnection(connection: Parameters<OAuthRepository['upsertOAuthConnection']>[0]): void {
    this.oauth.upsertOAuthConnection(connection);
  }

  deleteOAuthConnection(userId: number, provider: string): void {
    this.oauth.deleteOAuthConnection(userId, provider);
  }

  saveOAuthState(state: string, userId: number, provider: string): void {
    this.oauth.saveOAuthState(state, userId, provider);
  }

  consumeOAuthState(state: string): { userId: number; provider: string } | null {
    return this.oauth.consumeOAuthState(state);
  }

  cleanupExpiredOAuthStates(maxAgeMs: number): void {
    this.oauth.cleanupExpiredOAuthStates(maxAgeMs);
  }

  // ---- Feeds ----

  listFeeds(userId: number): Feed[] {
    return this.feeds.listFeeds(userId);
  }

  getFeed(userId: number, id: number): Feed | null {
    return this.feeds.getFeed(userId, id);
  }

  listFeedsForAllUsers(): Feed[] {
    return this.feeds.listFeedsForAllUsers();
  }

  addFeed(
    userId: number,
    name: string,
    url: string,
    webhookId: number | null,
    feedType: 'rss' | 'scrape',
    scrape: Feed['scrape'],
  ): Feed {
    return this.feeds.addFeed(userId, name, url, webhookId, feedType, scrape);
  }

  updateFeed(
    userId: number,
    id: number,
    fields: { name?: string; url?: string; webhookId?: number | null; enabled?: number },
  ): Feed | null {
    return this.feeds.updateFeed(userId, id, fields);
  }

  setFeedChecked(userId: number, id: number, lastEntryId: string | null): void {
    this.feeds.setFeedChecked(userId, id, lastEntryId);
  }

  deleteFeed(userId: number, id: number): void {
    this.feeds.deleteFeed(userId, id);
  }

  isEntrySent(feedId: number, entryId: string): boolean {
    return this.feeds.isEntrySent(feedId, entryId);
  }

  markEntrySent(feedId: number, entryId: string): void {
    this.feeds.markEntrySent(feedId, entryId);
  }

  latestFeeds(userId: number, limit: number): Feed[] {
    return this.feeds.latestFeeds(userId, limit);
  }

  // ---- Webhooks ----

  listWebhooks(userId: number): Webhook[] {
    return this.webhooks.listWebhooks(userId);
  }

  getWebhook(userId: number, id: number): Webhook | null {
    return this.webhooks.getWebhook(userId, id);
  }

  addWebhook(userId: number, name: string, url: string): Webhook {
    return this.webhooks.addWebhook(userId, name, url);
  }

  updateWebhook(userId: number, id: number, fields: { name?: string; url?: string; enabled?: number }): Webhook | null {
    return this.webhooks.updateWebhook(userId, id, fields);
  }

  deleteWebhook(userId: number, id: number): void {
    this.webhooks.deleteWebhook(userId, id);
  }

  // ---- Status monitors ----

  listMonitors(userId: number): SiteMonitor[] {
    return this.monitors.listMonitors(userId);
  }

  getMonitor(userId: number, id: number): SiteMonitor | null {
    return this.monitors.getMonitor(userId, id);
  }

  listMonitorsForAllUsers(): SiteMonitor[] {
    return this.monitors.listMonitorsForAllUsers();
  }

  addMonitor(userId: number, name: string, url: string, webhookId: number | null): SiteMonitor {
    return this.monitors.addMonitor(userId, name, url, webhookId);
  }

  updateMonitor(
    userId: number,
    id: number,
    fields: { name?: string; url?: string; webhookId?: number | null; enabled?: number },
  ): SiteMonitor | null {
    return this.monitors.updateMonitor(userId, id, fields);
  }

  setMonitorChecked(userId: number, id: number, status: string): void {
    this.monitors.setMonitorChecked(userId, id, status);
  }

  deleteMonitor(userId: number, id: number): void {
    this.monitors.deleteMonitor(userId, id);
  }

  // ---- Settings & activity ----

  getSetting(key: string): string | null {
    return this.settings.getSetting(key);
  }

  setSetting(key: string, value: string): void {
    this.settings.setSetting(key, value);
  }

  logActivity(userId: number | null, level: string, source: string, message: string): void {
    this.settings.logActivity(userId, level, source, message);
  }

  recentActivity(limit: number): ActivityEntry[] {
    return this.settings.recentActivity(limit);
  }
}
