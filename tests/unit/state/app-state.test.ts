import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AppState } from '../../../src/state/app-state.js';
import { Repository } from '../../../src/db/repository.js';
import { closeTestDb, openTestDb } from '../../helpers/db.js';
import type { Database } from '../../../src/db/database.js';

describe('AppState', () => {
  let db: Database;
  let repo: Repository;
  let state: AppState;

  beforeEach(() => {
    db = openTestDb('state');
    repo = new Repository(db);
    state = repo.state;
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it('hydrates users from the database', () => {
    repo.createUser('a@b.com', 'hash', 'A');
    const fresh = new AppState(db);
    expect(fresh.getUserById(1)?.email).toBe('a@b.com');
  });

  it('creates and reads feeds', () => {
    repo.createUser('a@b.com', 'hash', 'A');
    repo.addWebhook(1, 'w', 'http://discord.com/webhook/1/token');
    repo.addFeed(1, 'f', 'http://f', 1, 'rss', null);
    expect(state.listFeeds(1)).toHaveLength(1);
    expect(state.getFeed(1, 1)?.name).toBe('f');
  });

  it('scopes feeds by user', () => {
    repo.createUser('a@b.com', 'hash', 'A');
    repo.createUser('b@c.com', 'hash', 'B');
    repo.addFeed(1, 'f', 'http://f', null, 'rss', null);
    expect(state.listFeeds(2)).toHaveLength(0);
  });

  it('tracks sent entries', () => {
    repo.createUser('a@b.com', 'hash', 'A');
    repo.addFeed(1, 'f', 'http://f', null, 'rss', null);
    repo.markEntrySent(1, 'guid-1');
    expect(state.isEntrySent(1, 'guid-1')).toBe(true);
    expect(state.isEntrySent(1, 'guid-2')).toBe(false);
  });
});
