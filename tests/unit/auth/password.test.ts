import { describe, expect, it } from 'vitest';
import { passwordService, sessionService } from '../../../src/auth/password.js';

describe('passwordService', () => {
  it('hashes and verifies a password', () => {
    const hash = passwordService.hash('supersecret');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(passwordService.verify('supersecret', hash)).toBe(true);
    expect(passwordService.verify('wrong', hash)).toBe(false);
  });

  it('rejects malformed stored hashes', () => {
    expect(passwordService.verify('supersecret', 'not-a-hash')).toBe(false);
    expect(passwordService.verify('supersecret', '')).toBe(false);
  });
});

describe('sessionService', () => {
  it('returns a date in the future', () => {
    const before = Date.now();
    const expiry = sessionService.sessionExpiry();
    const after = Date.now();
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before);
    expect(expiry.getTime()).toBeGreaterThanOrEqual(after);
    expect(expiry.getTime() - before).toBeGreaterThan(29 * 24 * 3600_000);
  });
});
