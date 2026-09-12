import { randomUUID } from 'node:crypto';
import type { Repository } from '../db/repository.js';
import { passwordService, sessionService } from '../auth/password.js';

export class AuthError extends Error {}

export class AuthService {
  constructor(
    private readonly repo: Repository,
    private readonly emailPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ) {}

  register(
    email: string,
    password: string,
    displayName?: string,
  ): { user: { id: number; email: string; displayName: string; role: string }; token: string; expiresAt: Date } {
    const normalized = email.trim().toLowerCase();
    if (!this.emailPattern.test(normalized)) {
      throw new AuthError('Invalid email address');
    }
    if (password.length < 8) {
      throw new AuthError('Password must be at least 8 characters');
    }
    if (this.repo.getByEmail(normalized)) {
      throw new AuthError('An account with that email already exists');
    }
    const isFirstUser = this.repo.listUsers().length === 0;
    const user = this.repo.createUser(
      normalized,
      passwordService.hash(password),
      displayName?.trim() ?? normalized.split('@')[0],
      isFirstUser ? 'owner' : 'member',
    );
    return this.startSession(user.id);
  }

  login(
    email: string,
    password: string,
  ): { user: { id: number; email: string; displayName: string; role: string }; token: string; expiresAt: Date } {
    const normalized = email.trim().toLowerCase();
    const user = this.repo.getByEmail(normalized);
    if (!user || !passwordService.verify(password, user.passwordHash)) {
      throw new AuthError('Invalid email or password');
    }
    return this.startSession(user.id);
  }

  logout(token: string): void {
    this.repo.deleteSession(token);
  }

  private startSession(userId: number): {
    user: { id: number; email: string; displayName: string; role: string };
    token: string;
    expiresAt: Date;
  } {
    const user = this.repo.getUserById(userId);
    if (!user) throw new AuthError('User not found');
    const token = randomUUID().toString() + randomUUID().toString().replaceAll('-', '');
    const expiresAt = sessionService.sessionExpiry();
    this.repo.createSession(userId, token, expiresAt.toISOString());
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      token,
      expiresAt,
    };
  }
}
