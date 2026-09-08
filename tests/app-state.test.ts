import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Database } from '../src/db/database.js';
import { AppState } from '../src/state/app-state.js';

// Database uses node:sqlite. For tests we open a unique temp file DB to avoid
// cross-test cache pollution and close it after each test.
let fileId = 0;
function openTempDb(): Database {
  fileId += 1;
  return Database.open(`data/.tmp/state-${process.pid}-${fileId}.db`);
}

describe('AppState', () => {
  let db: Database;
  let state: AppState;

  beforeEach(() => {
    db = openTempDb();
    state = new AppState(db);
  });

  afterEach(() => {
    db?.close();
  });

  it('seed and read users by id and email', () => {
    state.putUser({
      id: 1,
      email: 'a@example.com',
      passwordHash: 'scrypt$salt$hex',
      displayName: 'A',
      createdAt: 'c',
    });
    state.putUser({
      id: 2,
      email: 'b@example.com',
      passwordHash: 'scrypt$salt$hex',
      displayName: 'B',
      createdAt: 'c',
    });
    expect(state.getUserById(1)?.email).toBe('a@example.com');
    expect(state.getUserByEmail('b@example.com')?.id).toBe(2);
  });

  it('sessions by token and delete', () => {
    state.putSession({ id: 1, userId: 1, token: 'tok', createdAt: 'c', expiresAt: 'e' });
    expect(state.getSessionByToken('tok')?.userId).toBe(1);
    state.deleteSession('tok');
    expect(state.getSessionByToken('tok')).toBeNull();
  });

  it('oauth state lifecycle and expiry', () => {
    state.putOAuthState({ state: 's1', userId: 1, provider: 'cloudflare', createdAt: '2026-01-01T00:00:00.000Z' });
    state.putOAuthState({ state: 's2', userId: 2, provider: 'github', createdAt: '2026-01-05T00:00:00.000Z' });
    expect(state.getOAuthState('s1')?.provider).toBe('cloudflare');
    const expired = state.expireOAuthStates('2026-01-03T00:00:00.000Z');
    expect(expired).toEqual(['s1']);
    expect(state.getOAuthState('s1')).toBeNull();
    expect(state.getOAuthState('s2')).not.toBeNull();
  });

  it('feed CRUD with user scoping', () => {
    state.putFeed({
      id: 1,
      userId: 1,
      name: 'Tech',
      url: 'u1',
      webhookId: null,
      enabled: 1,
      feedType: 'rss',
      scrape: null,
      lastEntryId: null,
      lastCheckedAt: null,
      createdAt: 'c',
    });
    state.putFeed({
      id: 2,
      userId: 2,
      name: 'Other',
      url: 'u2',
      webhookId: null,
      enabled: 1,
      feedType: 'rss',
      scrape: null,
      lastEntryId: null,
      lastCheckedAt: null,
      createdAt: 'c',
    });
    expect(state.listFeeds(1)).toHaveLength(1);
    expect(state.getFeed(1, 1)).not.toBeNull();
    expect(state.getFeed(2, 1)).toBeNull();
    expect(state.allFeeds()).toHaveLength(2);
    state.deleteFeed(1);
    expect(state.getFeed(1, 1)).toBeNull();
  });

  it('sent-entry dedupe set', () => {
    state.markEntrySent(1, 'entry-a');
    state.markEntrySent(1, 'entry-b');
    expect(state.isEntrySent(1, 'entry-a')).toBe(true);
    expect(state.isEntrySent(1, 'entry-b')).toBe(true);
    expect(state.isEntrySent(1, 'entry-c')).toBe(false);
  });

  it('webhook and monitor scoping', () => {
    state.putWebhook({ id: 1, userId: 1, name: 'W', url: 'w', enabled: 1, createdAt: 'c' });
    state.putWebhook({ id: 2, userId: 2, name: 'X', url: 'x', enabled: 1, createdAt: 'c' });
    expect(state.listWebhooks(1)).toHaveLength(1);
    expect(state.getWebhook(1, 1)).not.toBeNull();
    expect(state.getWebhook(2, 1)).toBeNull();

    state.putMonitor({ id: 1, userId: 1, name: 'M', url: 'm', enabled: 1, status: 'unknown', lastCheckedAt: null, webhookId: null, createdAt: 'c' });
    state.putMonitor({ id: 2, userId: 2, name: 'N', url: 'n', enabled: 1, status: 'unknown', lastCheckedAt: null, webhookId: null, createdAt: 'c' });
    expect(state.listMonitors(1)).toHaveLength(1);
    expect(state.allMonitors()).toHaveLength(2);
    state.setMonitorStatus(1, 'up', 't');
    expect(state.getMonitor(1, 1)?.status).toBe('up');
    expect(state.getMonitor(1, 1)?.lastCheckedAt).toBe('t');
  });

  it('settings and activity', () => {
    state.setSetting('k', 'v');
    expect(state.getSetting('k')).toBe('v');
    expect(state.getSetting('missing')).toBeNull();

    state.logActivity({ ts: 't1', userId: null, level: 'info', source: 'test', message: 'm1' });
    state.logActivity({ ts: 't2', userId: 1, level: 'warn', source: 'test', message: 'm2' });
    const recent = state.recentActivity(10);
    expect(recent).toHaveLength(2);
    expect(recent[0].message).toBe('m2');
  });

  it('hydrate reads persisted rows from the database', () => {
    // Persist via raw statements, then construct a fresh state to hydrate.
    const raw = db.raw;
    raw.prepare('INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)').run('hydrate@example.com', 'scrypt$salt$hex', 'Hydrate', '2026-01-01T00:00:00.000Z');
    raw.prepare('INSERT INTO feeds (user_id, name, url, webhook_id, enabled, feed_type, created_at) VALUES (1, ?, ?, NULL, 1, ?, ?)').run('Hydrated', 'https://hydrate.example/rss', 'rss', '2026-01-01T00:00:00.000Z');
    raw.prepare('INSERT INTO sent_entries (feed_id, entry_id, sent_at) VALUES (1, ?, ?)').run('entry-1', '2026-01-01T00:00:00.000Z');

    const state2 = new AppState(db);
    expect(state2.getUserByEmail('hydrate@example.com')?.displayName).toBe('Hydrate');
    const feeds = state2.allFeeds();
    expect(feeds).toHaveLength(1);
    expect(feeds[0].name).toBe('Hydrated');
    expect(state2.isEntrySent(1, 'entry-1')).toBe(true);
  });
});