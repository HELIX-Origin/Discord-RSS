import { describe, expect, it } from 'vitest';
import { rowToUser, rowToFeed } from '../../../src/state/types.js';

describe('row mappers', () => {
  it('maps user row', () => {
    const row = { id: 1, email: 'a@b.com', password_hash: 'h', display_name: 'A', created_at: 't' };
    expect(rowToUser(row)).toEqual({
      id: 1,
      email: 'a@b.com',
      passwordHash: 'h',
      displayName: 'A',
      createdAt: 't',
    });
  });

  it('maps feed row with scrape', () => {
    const row = {
      id: 1,
      user_id: 2,
      name: 'f',
      url: 'u',
      webhook_id: 3,
      enabled: 1,
      feed_type: 'scrape',
      scrape_item: 'li',
      scrape_title: 'h2',
      scrape_link: 'a',
      scrape_description: 'p',
      last_entry_id: 'lid',
      last_checked_at: 'lc',
      created_at: 'c',
    };
    expect(rowToFeed(row)).toEqual({
      id: 1,
      userId: 2,
      name: 'f',
      url: 'u',
      webhookId: 3,
      enabled: 1,
      feedType: 'scrape',
      scrape: { item: 'li', title: 'h2', link: 'a', description: 'p' },
      lastEntryId: 'lid',
      lastCheckedAt: 'lc',
      createdAt: 'c',
    });
  });

  it('returns null for undefined rows', () => {
    expect(rowToUser(undefined)).toBeNull();
  });
});
