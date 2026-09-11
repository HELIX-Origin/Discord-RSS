import type { Database } from '../db/database.js';
import {
  rowToDiscordGuild,
  rowToFeed,
  rowToOAuthConnection,
  rowToSession,
  rowToUser,
  type ActivityEntry,
  type DiscordGuild,
  type Feed,
  type OAuthConnection,
  type OAuthState,
  type Session,
  type User,
} from './types.js';

type Row = Record<string, unknown>;

function oauthKey(userId: number, provider: string): string {
  return `${userId}:${provider}`;
}

/**
 * In-memory mirror of the persistent dataset. This is the PRIMARY runtime
 * layer: the dashboard, watchers and API read exclusively through here and
 * never block on an empty or not-yet-written SQLite database. Mutations are
 * applied synchronously to memory; the repository persists them underneath.
 */
export class AppState {
  private usersById = new Map<number, User>();
  private usersByEmail = new Map<string, User>();
  private sessionsByToken = new Map<string, Session>();
  private oauthByUser = new Map<string, OAuthConnection>();
  private oauthStates = new Map<string, OAuthState>();
  private feedsById = new Map<number, Feed>();
  private discordGuilds = new Map<string, DiscordGuild>();
  private settings = new Map<string, string>();
  private activity: ActivityEntry[] = [];
  private sentByFeed = new Map<number, Set<string>>();

  constructor(private readonly db: Database) {
    this.hydrate();
  }

  // ---- Hydration ----

  private hydrate(): void {
    const raws = this.db.raw;

    for (const r of raws.prepare('SELECT * FROM users').all() as Row[]) {
      const u = rowToUser(r);
      if (u) this.putUser(u);
    }

    for (const r of raws.prepare('SELECT * FROM sessions').all() as Row[]) {
      const s = rowToSession(r);
      if (s) this.putSession(s);
    }

    for (const r of raws.prepare('SELECT * FROM oauth_connections').all() as Row[]) {
      const c = rowToOAuthConnection(r);
      if (c) this.putOAuthConnection(c);
    }

    for (const r of raws.prepare('SELECT * FROM oauth_states').all() as Row[]) {
      this.oauthStates.set(String(r.state), {
        state: String(r.state),
        userId: Number(r.user_id),
        provider: String(r.provider),
        createdAt: String(r.created_at),
      });
    }

    for (const r of raws.prepare('SELECT * FROM feeds').all() as Row[]) {
      const f = rowToFeed(r);
      if (f) this.putFeed(f);
    }

    for (const r of raws.prepare('SELECT * FROM discord_guilds').all() as Row[]) {
      const g = rowToDiscordGuild(r);
      if (g) this.putDiscordGuild(g);
    }

    for (const r of raws.prepare('SELECT * FROM settings').all() as Row[]) {
      this.settings.set(String(r.key), String(r.value));
    }

    for (const r of raws
      .prepare('SELECT ts, user_id, level, source, message FROM activity_log ORDER BY ts DESC LIMIT 500')
      .all() as Row[]) {
      this.activity.push({
        ts: String(r.ts),
        userId: r.user_id === null ? null : Number(r.user_id),
        level: String(r.level),
        source: String(r.source),
        message: String(r.message),
      });
    }

    for (const r of raws.prepare('SELECT feed_id, entry_id FROM sent_entries').all() as Row[]) {
      const feedId = Number(r.feed_id);
      if (!this.sentByFeed.has(feedId)) this.sentByFeed.set(feedId, new Set());
      this.sentByFeed.get(feedId)!.add(String(r.entry_id));
    }
  }

  // ---- Users ----

  getUserById(id: number): User | null {
    return this.usersById.get(id) ?? null;
  }

  getUserByEmail(email: string): User | null {
    return this.usersByEmail.get(email) ?? null;
  }

  listUsers(): User[] {
    return Array.from(this.usersById.values()).sort((a, b) => a.id - b.id);
  }

  putUser(user: User): void {
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
  }

  // ---- Sessions ----

  getSessionByToken(token: string): Session | null {
    return this.sessionsByToken.get(token) ?? null;
  }

  putSession(session: Session): void {
    this.sessionsByToken.set(session.token, session);
  }

  deleteSession(token: string): void {
    this.sessionsByToken.delete(token);
  }

  // ---- OAuth connections & states ----

  oauthConnectionsFor(userId: number): OAuthConnection[] {
    return [...this.oauthByUser.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => a.provider.localeCompare(b.provider));
  }

  getOAuthConnection(userId: number, provider: string): OAuthConnection | null {
    return this.oauthByUser.get(oauthKey(userId, provider)) ?? null;
  }

  putOAuthConnection(connection: OAuthConnection): void {
    this.oauthByUser.set(oauthKey(connection.userId, connection.provider), connection);
  }

  deleteOAuthConnection(userId: number, provider: string): void {
    this.oauthByUser.delete(oauthKey(userId, provider));
  }

  getOAuthState(state: string): OAuthState | null {
    return this.oauthStates.get(state) ?? null;
  }

  putOAuthState(state: OAuthState): void {
    this.oauthStates.set(state.state, state);
  }

  deleteOAuthState(state: string): void {
    this.oauthStates.delete(state);
  }

  expireOAuthStates(cutoffIso: string): string[] {
    const expired: string[] = [];
    for (const [state, entry] of this.oauthStates) {
      if (entry.createdAt < cutoffIso) {
        expired.push(state);
        this.oauthStates.delete(state);
      }
    }
    return expired;
  }

  // ---- Feeds ----

  listFeeds(userId: number): Feed[] {
    return [...this.feedsById.values()].filter((f) => f.userId === userId).sort((a, b) => a.name.localeCompare(b.name));
  }

  allFeeds(): Feed[] {
    return [...this.feedsById.values()];
  }

  getFeed(userId: number, id: number): Feed | null {
    const f = this.feedsById.get(id);
    return f && f.userId === userId ? f : null;
  }

  feedById(id: number): Feed | null {
    return this.feedsById.get(id) ?? null;
  }

  putFeed(feed: Feed): void {
    this.feedsById.set(feed.id, feed);
  }

  deleteFeed(id: number): void {
    this.feedsById.delete(id);
  }

  isEntrySent(feedId: number, entryId: string): boolean {
    return this.sentByFeed.get(feedId)?.has(entryId) ?? false;
  }

  markEntrySent(feedId: number, entryId: string): void {
    if (!this.sentByFeed.has(feedId)) this.sentByFeed.set(feedId, new Set());
    this.sentByFeed.get(feedId)!.add(entryId);
  }

  // ---- Discord Guilds ----

  getDiscordGuild(guildId: string): DiscordGuild | null {
    return this.discordGuilds.get(guildId) ?? null;
  }

  putDiscordGuild(guild: DiscordGuild): void {
    this.discordGuilds.set(guild.guildId, guild);
  }

  deleteDiscordGuild(guildId: string): void {
    this.discordGuilds.delete(guildId);
  }

  // ---- Settings ----

  getSetting(key: string): string | null {
    return this.settings.get(key) ?? null;
  }

  setSetting(key: string, value: string): void {
    this.settings.set(key, value);
  }

  // ---- Activity ----

  logActivity(entry: ActivityEntry): void {
    this.activity.unshift(entry);
    if (this.activity.length > 500) this.activity.pop();
  }

  recentActivity(limit: number): ActivityEntry[] {
    return this.activity.slice(0, limit);
  }
}
