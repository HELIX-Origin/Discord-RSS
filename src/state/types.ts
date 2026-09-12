export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Session {
  id: number;
  userId: number;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface OAuthConnection {
  id: number;
  userId: number;
  provider: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface OAuthState {
  state: string;
  userId: number | null;
  provider: string;
  createdAt: string;
}

export type FeedType =
  | 'rss'
  | 'scrape'
  | 'reddit'
  | 'free_games'
  | 'free_games_epic'
  | 'free_games_steam'
  | 'free_games_gog'
  | 'free_games_indiegala'
  | 'free_games_humble'
  | 'free_games_itchio'
  | 'free_games_ubisoft'
  | 'free_games_ea'
  | 'free_games_prime'
  | 'free_games_battlenet';

export interface Feed {
  id: number;
  userId: number;
  name: string;
  url: string;
  channelId: string | null;
  guildId?: string | null;
  enabled: number;
  feedType: FeedType;
  scrape: { item: string; title: string; link: string; description?: string } | null;
  lastEntryId: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  threadChannelId: string | null;
  threadEntryCount: number;
}

export interface DiscordGuild {
  guildId: string;
  userId: number;
  name: string;
  createdAt: string;
  threadsEnabled: number;
  forumChannelIds: string[];
}

export interface ActivityEntry {
  ts: string;
  userId: number | null;
  level: string;
  source: string;
  message: string;
}

export const nowIso = (): string => new Date().toISOString();

type Row = Record<string, unknown>;

export const rowToUser = (r: Row | undefined): User | null => {
  if (!r) return null;
  const id = Number(r.id);
  const rawRole = r.role !== undefined && r.role !== null ? String(r.role) : '';
  const role: UserRole =
    rawRole === 'owner' || rawRole === 'admin' || rawRole === 'member'
      ? (rawRole as UserRole)
      : rawRole === 'user'
        ? 'member'
        : id === 1
          ? 'owner'
          : 'member';
  return {
    id,
    email: String(r.email),
    passwordHash: String(r.password_hash),
    displayName: String(r.display_name),
    role,
    createdAt: String(r.created_at),
  };
};

export const rowToSession = (r: Row | undefined): Session | null => {
  if (!r) return null;
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    token: String(r.token),
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
  };
};

export const rowToOAuthConnection = (r: Row | undefined): OAuthConnection | null => {
  if (!r) return null;
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    provider: String(r.provider),
    providerAccountId: String(r.provider_account_id),
    accessToken: String(r.access_token),
    refreshToken: r.refresh_token === null ? null : String(r.refresh_token),
    expiresAt: r.expires_at === null ? null : String(r.expires_at),
    createdAt: String(r.created_at),
  };
};

export const rowToFeed = (r: Row | undefined): Feed | null => {
  if (!r) return null;
  const scrapeItem = r.scrape_item === null || r.scrape_item === undefined ? null : String(r.scrape_item);
  const scrapeTitle = r.scrape_title === null || r.scrape_title === undefined ? null : String(r.scrape_title);
  const scrapeLink = r.scrape_link === null || r.scrape_link === undefined ? null : String(r.scrape_link);
  const scrapeDescription =
    r.scrape_description === null || r.scrape_description === undefined ? null : String(r.scrape_description);
  const channelId = r.channel_id !== null && r.channel_id !== undefined ? String(r.channel_id) : null;
  const guildId = r.guild_id !== null && r.guild_id !== undefined ? String(r.guild_id) : null;
  const feedType = r.feed_type === 'scrape' ? 'scrape' : r.feed_type === 'reddit' ? 'reddit' : 'rss';
  const threadChannelId =
    r.thread_channel_id !== null && r.thread_channel_id !== undefined ? String(r.thread_channel_id) : null;
  const threadEntryCount = Number(r.thread_entry_count ?? 0);
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    name: String(r.name),
    url: String(r.url),
    channelId,
    guildId,
    enabled: Number(r.enabled),
    feedType,
    scrape:
      scrapeItem && scrapeTitle && scrapeLink
        ? { item: scrapeItem, title: scrapeTitle, link: scrapeLink, description: scrapeDescription ?? undefined }
        : null,
    lastEntryId: r.last_entry_id === null ? null : String(r.last_entry_id),
    lastCheckedAt: r.last_checked_at === null ? null : String(r.last_checked_at),
    createdAt: String(r.created_at),
    threadChannelId,
    threadEntryCount,
  };
};

export const rowToDiscordGuild = (r: Row | undefined): DiscordGuild | null => {
  if (!r) return null;
  let forumChannelIds: string[] = [];
  const rawForum = r.forum_channel_ids;
  if (typeof rawForum === 'string' && rawForum.trim()) {
    try {
      const parsed = JSON.parse(rawForum);
      if (Array.isArray(parsed)) {
        forumChannelIds = parsed.filter((id): id is string => typeof id === 'string');
      }
    } catch {
      forumChannelIds = rawForum
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }
  return {
    guildId: String(r.guild_id),
    userId: Number(r.user_id),
    name: String(r.name ?? ''),
    createdAt: String(r.created_at),
    threadsEnabled: Number(r.threads_enabled ?? 0),
    forumChannelIds,
  };
};
