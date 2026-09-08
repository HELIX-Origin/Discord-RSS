import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEYLEN = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expectedHex] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHex, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export interface PasswordService {
  hash(password: string): string;
  verify(password: string, stored: string): boolean;
}

export const passwordService: PasswordService = {
  hash: hashPassword,
  verify: verifyPassword,
};

const SESSION_DAYS = 30;

export interface SessionService {
  sessionExpiry(): Date;
}

export const sessionService: SessionService = {
  sessionExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + SESSION_DAYS);
    return expiry;
  },
};