import type { ActivityEntry, Feed, OAuthConnection, OAuthState, Session, User } from '../../src/state/types.js';

export function userFactory(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? 1;
  return {
    id,
    email: `user-${id}@example.com`,
    passwordHash: 'scrypt$hash',
    displayName: `User ${id}`,
    role: 'member',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function sessionFactory(overrides: Partial<Session> = {}): Session {
  const id = overrides.id ?? 1;
  return {
    id,
    userId: 1,
    token: `token-${id}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
    ...overrides,
  };
}

export function oauthConnectionFactory(overrides: Partial<OAuthConnection> = {}): OAuthConnection {
  const id = overrides.id ?? 1;
  return {
    id,
    userId: 1,
    provider: 'discord',
    providerAccountId: `account-${id}`,
    accessToken: `access-${id}`,
    refreshToken: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function oauthStateFactory(overrides: Partial<OAuthState> = {}): OAuthState {
  return {
    state: `state-${Date.now()}`,
    userId: 1,
    provider: 'discord',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function feedFactory(overrides: Partial<Feed> = {}): Feed {
  const id = overrides.id ?? 1;
  return {
    id,
    userId: 1,
    name: `Feed ${id}`,
    url: `https://example.com/feed-${id}.xml`,
    channelId: null,
    enabled: 1,
    feedType: 'rss',
    scrape: null,
    lastEntryId: null,
    lastCheckedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function activityEntryFactory(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    ts: new Date().toISOString(),
    userId: null,
    level: 'info',
    source: 'test',
    message: 'Test activity entry',
    ...overrides,
  };
}
