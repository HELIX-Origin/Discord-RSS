import type { Database } from './database.js';
import { AppState } from '../state/app-state.js';
import { UserRepository } from './repositories/users.js';
import { OAuthRepository } from './repositories/oauth.js';
import { FeedRepository } from './repositories/feeds.js';
import { SettingsRepository } from './repositories/settings.js';
import type { ActivityEntry, Feed, OAuthConnection, Session, User, UserRole } from '../state/types.js';

export type { ActivityEntry, Feed, OAuthConnection, OAuthState, Session, User, UserRole } from '../state/types.js';

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
  private readonly settings: SettingsRepository;

  constructor(private readonly db: Database) {
    this.state = new AppState(db);
    this.users = new UserRepository(db, this.state);
    this.oauth = new OAuthRepository(db, this.state);
    this.feeds = new FeedRepository(db, this.state);
    this.settings = new SettingsRepository(db, this.state);
  }

  // ---- Users & auth ----

  createUser(email: string, passwordHash: string, displayName: string, role: UserRole = 'member'): User {
    return this.users.createUser(email, passwordHash, displayName, role);
  }

  listUsers(): User[] {
    return this.users.listUsers();
  }

  setUserRole(userId: number, role: UserRole): void {
    this.users.setUserRole(userId, role);
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

  getGuildBinding(guildId: string): import('../state/types.js').DiscordGuild | null {
    return this.users.getGuildBinding(guildId);
  }

  bindGuild(guildId: string, userId: number, name = ''): import('../state/types.js').DiscordGuild {
    return this.users.bindGuild(guildId, userId, name);
  }

  getOrCreateGuildUser(guildId: string, guildName = ''): User {
    return this.users.getOrCreateGuildUser(guildId, guildName);
  }

  getOrCreateOwnerUser(): User {
    return this.users.getOrCreateOwnerUser();
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

  saveOAuthState(state: string, userId: number | null, provider: string): void {
    this.oauth.saveOAuthState(state, userId, provider);
  }

  consumeOAuthState(state: string): { userId: number | null; provider: string } | null {
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
    channelId: string | null,
    feedType: 'rss' | 'scrape',
    scrape: Feed['scrape'],
    guildId?: string | null,
  ): Feed {
    return this.feeds.addFeed(userId, name, url, channelId, feedType, scrape, guildId);
  }

  updateFeed(
    userId: number,
    id: number,
    fields: {
      name?: string;
      url?: string;
      channelId?: string | null;
      guildId?: string | null;
      enabled?: number;
    },
  ): Feed | null {
    return this.feeds.updateFeed(userId, id, fields);
  }

  deleteGuildData(guildId: string): { feedsDeleted: number; guildsDeleted: number } {
    const feedsToDelete = this.state.allFeeds().filter((f) => f.guildId === guildId);

    const dedicatedGuildUser = this.state.getUserByEmail(`guild-${guildId}@discord.rss`);
    if (dedicatedGuildUser) {
      const userFeeds = this.state.listFeeds(dedicatedGuildUser.id);
      for (const uf of userFeeds) {
        if (!feedsToDelete.some((f) => f.id === uf.id)) {
          feedsToDelete.push(uf);
        }
      }
    }

    let feedsDeleted = 0;
    for (const feed of feedsToDelete) {
      this.db.raw.prepare('DELETE FROM sent_entries WHERE feed_id = ?').run(feed.id);
      this.db.raw.prepare('DELETE FROM feeds WHERE id = ?').run(feed.id);
      this.state.deleteFeed(feed.id);
      feedsDeleted++;
    }

    const dbFeedsRes = this.db.raw.prepare('DELETE FROM feeds WHERE guild_id = ?').run(guildId);
    feedsDeleted = Math.max(feedsDeleted, Number(dbFeedsRes.changes));

    const guildRes = this.db.raw.prepare('DELETE FROM discord_guilds WHERE guild_id = ?').run(guildId);
    const guildsDeleted = Number(guildRes.changes);
    this.state.deleteDiscordGuild(guildId);

    if (dedicatedGuildUser) {
      this.db.raw.prepare('DELETE FROM users WHERE id = ?').run(dedicatedGuildUser.id);
      this.state.deleteUser(dedicatedGuildUser.id);
    }

    for (const user of this.state.listUsers()) {
      const raw = this.getUserSetting(user.id, 'managed_guild_ids');
      if (raw) {
        try {
          const ids = JSON.parse(raw) as string[];
          if (Array.isArray(ids) && ids.includes(guildId)) {
            const updated = ids.filter((id) => id !== guildId);
            this.setUserSetting(user.id, 'managed_guild_ids', JSON.stringify(updated));
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    this.logActivity(
      null,
      'info',
      'bot',
      `Deleted all data for guild ${guildId} (${feedsDeleted} feeds, ${guildsDeleted} guild records) due to bot removal.`,
    );

    return { feedsDeleted, guildsDeleted };
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

  // ---- Settings & activity ----

  getSetting(key: string): string | null {
    return this.settings.getSetting(key);
  }

  setSetting(key: string, value: string): void {
    this.settings.setSetting(key, value);
  }

  getUserSetting(userId: number, key: string): string | null {
    return this.settings.getUserSetting(userId, key);
  }

  setUserSetting(userId: number, key: string, value: string): void {
    this.settings.setUserSetting(userId, key, value);
  }

  logActivity(userId: number | null, level: string, source: string, message: string): void {
    this.settings.logActivity(userId, level, source, message);
  }

  recentActivity(limit: number): ActivityEntry[] {
    return this.settings.recentActivity(limit);
  }
}
