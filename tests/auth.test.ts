import { describe, expect, it } from 'vitest';
import { passwordService } from '../src/auth/password.js';
import { AuthError, AuthService } from '../src/auth/service.js';
import { Database } from '../src/db/database.js';
import { Repository } from '../src/db/repository.js';
import { AppState } from '../src/state/app-state.js';
import { testDbPath } from './test-helpers.js';

describe('passwordService', () => {
  it('hashes and verifies a password', () => {
    const stored = passwordService.hash('correct horse battery');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(passwordService.verify('correct horse battery', stored)).toBe(true);
    expect(passwordService.verify('wrong password', stored)).toBe(false);
  });

  it('produces distinct hashes per salt', () => {
    expect(passwordService.hash('same')).not.toBe(passwordService.hash('same'));
  });

  it('rejects non-scrypt stored values', () => {
    expect(passwordService.verify('x', 'plain')).toBe(false);
    expect(passwordService.verify('x', 'scrypt$onlytwo')).toBe(false);
  });
});

describe('AuthService (round-trip via Repository/AppState)', () => {
  let db: Database;
  let repo: Repository;
  let auth: AuthService;

  const setup = () => {
    db = Database.open(testDbPath('auth'));
    repo = new Repository(db);
    auth = new AuthService(repo);
  };

  it('registers a user and returns a session', () => {
    setup();
    const result = auth.register('User@Example.com', 'password123', '  My Name  ');
    expect(result.user.email).toBe('user@example.com');
    expect(result.user.displayName).toBe('My Name');
    expect(result.token).toBeTruthy();
    const stored = repo.getByEmail('user@example.com');
    expect(stored).not.toBeNull();
    expect(repo.getSessionByToken(result.token)).not.toBeNull();
    expect(repo.getUserBySessionToken(result.token)?.id).toBe(result.user.id);
    db.close();
  });

  it('defaults displayName to email local part', () => {
    setup();
    const { user } = auth.register('other@example.com', 'password123');
    expect(user.displayName).toBe('other');
    db.close();
  });

  it('rejects invalid email and short password', () => {
    setup();
    expect(() => auth.register('not-an-email', 'password123')).toThrow(AuthError);
    expect(() => auth.register('ok@example.com', 'short')).toThrow(/at least 8/);
    db.close();
  });

  it('rejects duplicate email', () => {
    setup();
    auth.register('dup@example.com', 'password123');
    expect(() => auth.register('dup@example.com', 'password123')).toThrow(/already exists/);
    db.close();
  });

  it('logs in with correct credentials and rejects wrong password', () => {
    setup();
    const reg = auth.register('login@example.com', 'password123');
    const loggedIn = auth.login('Login@Example.com', 'password123');
    expect(loggedIn.user.id).toBe(reg.user.id);
    expect(() => auth.login('login@example.com', 'wrongpass')).toThrow(/Invalid email or password/);
    expect(() => auth.login('missing@example.com', 'password123')).toThrow(/Invalid email or password/);
    db.close();
  });

  it('logout invalidates a session', () => {
    setup();
    const { token } = auth.register('logout@example.com', 'password123');
    auth.logout(token);
    expect(repo.getSessionByToken(token)).toBeNull();
    db.close();
  });

  it('expired sessions are cleaned on lookup', () => {
    setup();
    const result = auth.register('expire@example.com', 'password123');
    const session = repo.getSessionByToken(result.token)!;
    repo.state.deleteSession(result.token);
    // Re-insert with an expired expiry directly to simulate clock drift
    repo.state.putSession({ ...session, expiresAt: '2000-01-01T00:00:00.000Z' });
    expect(repo.getUserBySessionToken(result.token)).toBeNull();
    expect(repo.getSessionByToken(result.token)).toBeNull();
    db.close();
  });
});

describe('AppState expireOAuthStates', () => {
  it('returns expired states and removes them', () => {
    const db = Database.open(testDbPath('oauth'));
    const state = new AppState(db);
    state.putOAuthState({ state: 'old', userId: 1, provider: 'cloudflare', createdAt: '2026-01-01T00:00:00.000Z' });
    state.putOAuthState({ state: 'new', userId: 1, provider: 'cloudflare', createdAt: '2026-01-10T00:00:00.000Z' });
    const expired = state.expireOAuthStates('2026-01-05T00:00:00.000Z');
    expect(expired).toEqual(['old']);
    expect(state.getOAuthState('old')).toBeNull();
    expect(state.getOAuthState('new')).not.toBeNull();
    db.close();
  });
});