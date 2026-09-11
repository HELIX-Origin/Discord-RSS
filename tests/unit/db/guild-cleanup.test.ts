import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { openTestDb, closeTestDb, testDbPath } from '../../helpers/db.js';
import { Repository } from '../../../src/db/repository.js';
import { Database } from '../../../src/db/database.js';

describe('Guild Data Cleanup on Bot Removal', () => {
  let db: Database;
  let repo: Repository;

  beforeEach(() => {
    db = openTestDb('guild-cleanup', 'error');
    repo = new Repository(db);
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it('deletes all guild feeds, sent entries, guild bindings, and settings when bot is removed', () => {
    // 1. Create users
    const owner = repo.createUser('owner@example.com', 'hash', 'Owner', 'owner');
    const member = repo.createUser('member@example.com', 'hash', 'Member', 'member');

    // 2. Set up managed_guild_ids for member
    repo.setUserSetting(member.id, 'managed_guild_ids', JSON.stringify(['guild-1', 'guild-2']));

    // 3. Create discord_guilds bindings
    repo.bindGuild('guild-1', owner.id, 'Guild One');
    repo.bindGuild('guild-2', owner.id, 'Guild Two');

    // 4. Create feeds for guild-1 and guild-2
    const feed1 = repo.addFeed(
      owner.id,
      'Guild 1 Feed A',
      'https://example.com/g1a.xml',
      'channel-1a',
      'rss',
      null,
      'guild-1',
    );
    const feed2 = repo.addFeed(
      owner.id,
      'Guild 1 Feed B',
      'https://example.com/g1b.xml',
      'channel-1b',
      'rss',
      null,
      'guild-1',
    );
    const feedOther = repo.addFeed(
      owner.id,
      'Guild 2 Feed',
      'https://example.com/g2.xml',
      'channel-2',
      'rss',
      null,
      'guild-2',
    );

    // 5. Mark entries sent
    repo.markEntrySent(feed1.id, 'entry-1');
    repo.markEntrySent(feed2.id, 'entry-2');
    repo.markEntrySent(feedOther.id, 'entry-other');

    expect(repo.isEntrySent(feed1.id, 'entry-1')).toBe(true);
    expect(repo.isEntrySent(feedOther.id, 'entry-other')).toBe(true);

    // 6. Execute deleteGuildData for guild-1
    const result = repo.deleteGuildData('guild-1');
    expect(result.feedsDeleted).toBe(2);
    expect(result.guildsDeleted).toBe(1);

    // 7. Verify guild-1 feeds are removed from repository/AppState
    const remainingFeeds = repo.listFeedsForAllUsers();
    expect(remainingFeeds.some((f) => f.id === feed1.id)).toBe(false);
    expect(remainingFeeds.some((f) => f.id === feed2.id)).toBe(false);
    expect(remainingFeeds.some((f) => f.id === feedOther.id)).toBe(true);

    // Verify sent entries for guild-1 feeds are cleared
    expect(repo.isEntrySent(feed1.id, 'entry-1')).toBe(false);
    expect(repo.isEntrySent(feedOther.id, 'entry-other')).toBe(true);

    // 8. Verify SQLite tables directly
    const rawFeeds = db.raw.prepare('SELECT id FROM feeds WHERE guild_id = ?').all('guild-1');
    expect(rawFeeds.length).toBe(0);

    const rawOtherFeeds = db.raw.prepare('SELECT id FROM feeds WHERE guild_id = ?').all('guild-2');
    expect(rawOtherFeeds.length).toBe(1);

    const rawGuild = db.raw.prepare('SELECT guild_id FROM discord_guilds WHERE guild_id = ?').all('guild-1');
    expect(rawGuild.length).toBe(0);

    // 9. Verify guild binding in AppState is cleared
    expect(repo.getGuildBinding('guild-1')).toBeNull();
    expect(repo.getGuildBinding('guild-2')).not.toBeNull();

    // 10. Verify member managed_guild_ids had guild-1 removed, leaving guild-2
    const updatedManaged = repo.getUserSetting(member.id, 'managed_guild_ids');
    expect(updatedManaged).toBe(JSON.stringify(['guild-2']));

    // 11. Verify activity log entry
    const activities = repo.recentActivity(10);
    expect(activities.some((a) => a.message.includes('Deleted all data for guild guild-1'))).toBe(true);
  });

  it('migrates an existing database created without guild_id column seamlessly', () => {
    const legacyPath = testDbPath('legacy-db');
    const rawDb = new DatabaseSync(legacyPath);
    // Create legacy feeds table without guild_id
    rawDb.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL
      );
      CREATE TABLE feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        channel_id TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        feed_type TEXT NOT NULL DEFAULT 'rss',
        scrape_item TEXT,
        scrape_title TEXT,
        scrape_link TEXT,
        scrape_description TEXT,
        last_entry_id TEXT,
        last_checked_at TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, url)
      );
      INSERT INTO users (id, email, password_hash, created_at) VALUES (1, 'u@example.com', 'hash', 'now');
      INSERT INTO feeds (id, user_id, name, url, created_at) VALUES (1, 1, 'Legacy Feed', 'https://example.com/rss', 'now');
    `);
    rawDb.close();

    // Now open with Database.open, which triggers migrate()
    const migratedDb = Database.open(legacyPath, 'error');
    const migratedRepo = new Repository(migratedDb);

    // Verify feeds column info includes guild_id
    const tableInfo = migratedDb.raw.prepare('PRAGMA table_info(feeds)').all() as Array<{ name: string }>;
    expect(tableInfo.some((c) => c.name === 'guild_id')).toBe(true);

    // Verify feed is loaded in repository
    const feed = migratedRepo.getFeed(1, 1);
    expect(feed).not.toBeNull();
    expect(feed?.name).toBe('Legacy Feed');
    expect(feed?.guildId).toBeNull();

    migratedDb.close();
  });
});
