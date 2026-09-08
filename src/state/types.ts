export interface User {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
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
  userId: number;
  provider: string;
  createdAt: string;
}

export interface Feed {
  id: number;
  userId: number;
  name: string;
  url: string;
  webhookId: number | null;
  enabled: number;
  feedType: 'rss' | 'scrape';
  scrape: { item: string; title: string; link: string; description?: string } | null;
  lastEntryId: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface Webhook {
  id: number;
  userId: number;
  name: string;
  url: string;
  enabled: number;
  createdAt: string;
}

export interface SiteMonitor {
  id: number;
  userId: number;
  name: string;
  url: string;
  enabled: number;
  status: string;
  lastCheckedAt: string | null;
  webhookId: number | null;
  createdAt: string;
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
  return {
    id: Number(r.id),
    email: String(r.email),
    passwordHash: String(r.password_hash),
    displayName: String(r.display_name),
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
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    name: String(r.name),
    url: String(r.url),
    webhookId: r.webhook_id === null ? null : Number(r.webhook_id),
    enabled: Number(r.enabled),
    feedType: r.feed_type === 'scrape' ? 'scrape' : 'rss',
    scrape:
      scrapeItem && scrapeTitle && scrapeLink
        ? { item: scrapeItem, title: scrapeTitle, link: scrapeLink, description: scrapeDescription ?? undefined }
        : null,
    lastEntryId: r.last_entry_id === null ? null : String(r.last_entry_id),
    lastCheckedAt: r.last_checked_at === null ? null : String(r.last_checked_at),
    createdAt: String(r.created_at),
  };
};

export const rowToWebhook = (r: Row | undefined): Webhook | null => {
  if (!r) return null;
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    name: String(r.name),
    url: String(r.url),
    enabled: Number(r.enabled),
    createdAt: String(r.created_at),
  };
};

export const rowToMonitor = (r: Row | undefined): SiteMonitor | null => {
  if (!r) return null;
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    name: String(r.name),
    url: String(r.url),
    enabled: Number(r.enabled),
    status: String(r.status),
    lastCheckedAt: r.last_checked_at === null ? null : String(r.last_checked_at),
    webhookId: r.webhook_id === null ? null : Number(r.webhook_id),
    createdAt: String(r.created_at),
  };
};
