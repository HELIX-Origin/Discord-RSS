import { describe, expect, it } from 'vitest';
import {
  rowToFeed,
  rowToMonitor,
  rowToOAuthConnection,
  rowToSession,
  rowToUser,
  rowToWebhook,
} from '../src/state/types.js';

describe('row mappers', () => {
  it('rowToUser maps a valid row and returns null for undefined', () => {
    const row = {
      id: 1,
      email: 'a@example.com',
      password_hash: 'scrypt$salt$hex',
      display_name: 'A',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const user = rowToUser(row);
    expect(user).toEqual({
      id: 1,
      email: 'a@example.com',
      passwordHash: 'scrypt$salt$hex',
      displayName: 'A',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(rowToUser(undefined)).toBeNull();
  });

  it('rowToSession coerces numbers and null-safe fields', () => {
    expect(rowToSession({ id: 2, user_id: '1', token: 't', created_at: 'c', expires_at: 'e' })).toEqual({
      id: 2,
      userId: 1,
      token: 't',
      createdAt: 'c',
      expiresAt: 'e',
    });
    expect(rowToSession(undefined)).toBeNull();
  });

  it('rowToOAuthConnection handles nullable refresh_token/expires_at', () => {
    const withTokens = rowToOAuthConnection({
      id: 3,
      user_id: 1,
      provider: 'cloudflare',
      provider_account_id: 'acc',
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: 'e',
      created_at: 'c',
    });
    expect(withTokens).not.toBeNull();
    expect(withTokens!.refreshToken).toBe('rt');
    expect(withTokens!.expiresAt).toBe('e');

    const withoutTokens = rowToOAuthConnection({
      id: 3,
      user_id: 1,
      provider: 'cloudflare',
      provider_account_id: 'acc',
      access_token: 'at',
      refresh_token: null,
      expires_at: null,
      created_at: 'c',
    });
    expect(withoutTokens!.refreshToken).toBeNull();
    expect(withoutTokens!.expiresAt).toBeNull();
    expect(rowToOAuthConnection(undefined)).toBeNull();
  });

  it('rowToFeed maps rss feed with null scrape', () => {
    const rss = rowToFeed({
      id: 4,
      user_id: 1,
      name: 'Tech',
      url: 'https://example.com/feed.xml',
      webhook_id: null,
      enabled: 1,
      feed_type: 'rss',
      scrape_item: null,
      scrape_title: null,
      scrape_link: null,
      scrape_description: null,
      last_entry_id: null,
      last_checked_at: null,
      created_at: 'c',
    });
    expect(rss).toEqual({
      id: 4,
      userId: 1,
      name: 'Tech',
      url: 'https://example.com/feed.xml',
      webhookId: null,
      enabled: 1,
      feedType: 'rss',
      scrape: null,
      lastEntryId: null,
      lastCheckedAt: null,
      createdAt: 'c',
    });
  });

  it('rowToFeed maps scrape feed and builds scrape config', () => {
    const scrape = rowToFeed({
      id: 5,
      user_id: 1,
      name: 'Forum',
      url: 'https://example.com/threads',
      webhook_id: 9,
      enabled: 0,
      feed_type: 'scrape',
      scrape_item: 'li.thread',
      scrape_title: 'a.title',
      scrape_link: 'a.title',
      scrape_description: 'p.desc',
      last_entry_id: 'x',
      last_checked_at: 't',
      created_at: 'c',
    });
    expect(scrape!).toEqual({
      id: 5,
      userId: 1,
      name: 'Forum',
      url: 'https://example.com/threads',
      webhookId: 9,
      enabled: 0,
      feedType: 'scrape',
      scrape: { item: 'li.thread', title: 'a.title', link: 'a.title', description: 'p.desc' },
      lastEntryId: 'x',
      lastCheckedAt: 't',
      createdAt: 'c',
    });
  });

  it('rowToFeed treats non-scrape feed_type as rss', () => {
    const feed = rowToFeed({
      id: 6,
      user_id: 1,
      name: 'N',
      url: 'u',
      webhook_id: null,
      enabled: 1,
      feed_type: 'bogus',
      scrape_item: null,
      scrape_title: null,
      scrape_link: null,
      scrape_description: null,
      last_entry_id: null,
      last_checked_at: null,
      created_at: 'c',
    });
    expect(feed!.feedType).toBe('rss');
  });

  it('rowToWebhook maps a row', () => {
    expect(
      rowToWebhook({ id: 7, user_id: 1, name: 'W', url: 'https://discord.com/api/webhooks/x/y', enabled: 1, created_at: 'c' }),
    ).toEqual({
      id: 7,
      userId: 1,
      name: 'W',
      url: 'https://discord.com/api/webhooks/x/y',
      enabled: 1,
      createdAt: 'c',
    });
  });

  it('rowToMonitor maps nullable webhook and status', () => {
    expect(
      rowToMonitor({
        id: 8,
        user_id: 1,
        name: 'M',
        url: 'https://site.example',
        enabled: 1,
        status: 'down',
        last_checked_at: null,
        webhook_id: null,
        created_at: 'c',
      }),
    ).toEqual({
      id: 8,
      userId: 1,
      name: 'M',
      url: 'https://site.example',
      enabled: 1,
      status: 'down',
      lastCheckedAt: null,
      webhookId: null,
      createdAt: 'c',
    });
    expect(rowToMonitor(undefined)).toBeNull();
  });
});