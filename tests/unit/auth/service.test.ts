import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthError } from '../../../src/auth/service.js';
import { Repository } from '../../../src/db/repository.js';
import { closeTestDb, openTestDb } from '../../helpers/db.js';
import type { Database } from '../../../src/db/database.js';

describe('AuthService', () => {
  let db: Database;
  let repo: Repository;
  let auth: AuthService;

  beforeEach(() => {
    db = openTestDb('auth');
    repo = new Repository(db);
    auth = new AuthService(repo);
  });

  afterEach(async () => {
    await closeTestDb(db);
  });

  it('registers a user and returns a session', () => {
    const result = auth.register('alice@example.com', 'password123');
    expect(result.user.email).toBe('alice@example.com');
    expect(result.token).toBeTruthy();
    expect(result.user.displayName).toBe('alice');
  });

  it('uses provided display name', () => {
    const result = auth.register('bob@example.com', 'password123', 'Bob');
    expect(result.user.displayName).toBe('Bob');
  });

  it('rejects invalid email', () => {
    expect(() => auth.register('not-an-email', 'password123')).toThrow(AuthError);
  });

  it('rejects short password', () => {
    expect(() => auth.register('carol@example.com', 'short')).toThrow(AuthError);
  });

  it('rejects duplicate email', () => {
    auth.register('dave@example.com', 'password123');
    expect(() => auth.register('dave@example.com', 'password123')).toThrow(AuthError);
  });

  it('logs in with correct credentials', () => {
    auth.register('eve@example.com', 'password123');
    const result = auth.login('eve@example.com', 'password123');
    expect(result.user.email).toBe('eve@example.com');
  });

  it('rejects wrong password', () => {
    auth.register('frank@example.com', 'password123');
    expect(() => auth.login('frank@example.com', 'wrong')).toThrow(AuthError);
  });

  it('logs out a session', () => {
    const session = auth.register('grace@example.com', 'password123');
    auth.logout(session.token);
    expect(repo.getUserBySessionToken(session.token)).toBeNull();
  });
});
