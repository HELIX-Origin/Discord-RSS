import type { Database } from '../database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type DiscordGuild, type Session, type User, type UserRole } from '../../state/types.js';

/**
 * Users & sessions persistence.
 */
export class UserRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  createUser(email: string, passwordHash: string, displayName: string, role: UserRole = 'member'): User {
    const result = this.db.raw
      .prepare('INSERT INTO users (email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(email, passwordHash, displayName, role, nowIso());
    const user: User = {
      id: Number(result.lastInsertRowid),
      email,
      passwordHash,
      displayName,
      role,
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

  getGuildBinding(guildId: string): DiscordGuild | null {
    return this.state.getDiscordGuild(guildId);
  }

  bindGuild(guildId: string, userId: number, name = ''): DiscordGuild {
    this.db.raw
      .prepare(
        'INSERT INTO discord_guilds (guild_id, user_id, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET user_id = excluded.user_id, name = excluded.name',
      )
      .run(guildId, userId, name, nowIso());
    const existing = this.state.getDiscordGuild(guildId);
    const guild: DiscordGuild = {
      guildId,
      userId,
      name,
      createdAt: existing?.createdAt ?? nowIso(),
      threadsEnabled: existing?.threadsEnabled ?? 0,
      forumChannelIds: existing?.forumChannelIds ?? [],
    };
    this.state.putDiscordGuild(guild);
    return guild;
  }

  setGuildThreadConfig(
    guildId: string,
    config: { threadsEnabled: boolean; forumChannelIds: string[] },
  ): DiscordGuild | null {
    const existing = this.state.getDiscordGuild(guildId);
    const userId = existing?.userId ?? 0;
    const name = existing?.name ?? '';
    const threadsEnabled = config.threadsEnabled ? 1 : 0;
    const forumChannelIds = JSON.stringify(config.forumChannelIds);
    this.db.raw
      .prepare(
        `INSERT INTO discord_guilds (guild_id, user_id, name, created_at, threads_enabled, forum_channel_ids)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET threads_enabled = excluded.threads_enabled, forum_channel_ids = excluded.forum_channel_ids`,
      )
      .run(guildId, userId, name, existing?.createdAt ?? nowIso(), threadsEnabled, forumChannelIds);
    const guild: DiscordGuild = {
      guildId,
      userId,
      name,
      createdAt: existing?.createdAt ?? nowIso(),
      threadsEnabled,
      forumChannelIds: config.forumChannelIds,
    };
    this.state.putDiscordGuild(guild);
    return guild;
  }

  listUsers(): User[] {
    return this.state.listUsers();
  }

  setUserRole(userId: number, role: UserRole): void {
    const user = this.getUserById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    this.db.raw.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    const updated: User = { ...user, role };
    this.state.putUser(updated);
  }

  getOrCreateOwnerUser(): User {
    let owner = this.getByEmail('owner@localhost');
    if (owner) {
      if (owner.role !== 'owner') {
        this.db.raw.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', owner.id);
        owner = { ...owner, role: 'owner' };
        this.state.putUser(owner);
      }
      return owner;
    }
    owner = this.getUserById(1);
    if (owner) {
      if (owner.role !== 'owner') {
        this.db.raw.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', owner.id);
        owner = { ...owner, role: 'owner' };
        this.state.putUser(owner);
      }
      return owner;
    }
    return this.createUser('owner@localhost', 'RESERVED_HOST_OWNER', 'Owner', 'owner');
  }

  getOrCreateGuildUser(guildId: string, guildName = ''): User {
    const existingBinding = this.getGuildBinding(guildId);
    if (existingBinding) {
      const user = this.getUserById(existingBinding.userId);
      if (user) return user;
    }

    // Check if host user exists (Owner) to bind by default
    const hostUser = this.getOrCreateOwnerUser();
    if (hostUser) {
      this.bindGuild(guildId, hostUser.id, guildName);
      return hostUser;
    }

    // Otherwise create a dedicated user for this guild
    const email = `guild-${guildId}@discord.rss`;
    const user =
      this.getByEmail(email) ??
      this.createUser(email, 'discord-guild-user', guildName ? `Guild: ${guildName}` : `Guild ${guildId}`);
    this.bindGuild(guildId, user.id, guildName);
    return user;
  }
}
