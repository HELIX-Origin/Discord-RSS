import { describe, expect, it } from 'vitest';
import { rowToUser, rowToFeed } from '../../../src/state/types.js';

describe('row mappers', () => {
  it('maps user row', () => {
    const ownerRow = { id: 1, email: 'a@b.com', password_hash: 'h', display_name: 'A', created_at: 't' };
    expect(rowToUser(ownerRow)).toEqual({
      id: 1,
      email: 'a@b.com',
      passwordHash: 'h',
      displayName: 'A',
      role: 'owner',
      createdAt: 't',
    });

    const userRow = {
      id: 2,
      email: 'u@b.com',
      password_hash: 'h',
      display_name: 'U',
      role: 'admin',
      created_at: 't',
    };
    expect(rowToUser(userRow)).toEqual({
      id: 2,
      email: 'u@b.com',
      passwordHash: 'h',
      displayName: 'U',
      role: 'admin',
      createdAt: 't',
    });

    const memberRow = {
      id: 3,
      email: 'm@b.com',
      password_hash: 'h',
      display_name: 'M',
      role: 'member',
      created_at: 't',
    };
    expect(rowToUser(memberRow)).toEqual({
      id: 3,
      email: 'm@b.com',
      passwordHash: 'h',
      displayName: 'M',
      role: 'member',
      createdAt: 't',
    });
  });

  it('maps feed row with scrape', () => {
    const row = {
      id: 1,
      user_id: 2,
      name: 'f',
      url: 'u',
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
      channelId: null,
      guildId: null,
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
