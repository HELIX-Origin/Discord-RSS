import type { Database } from '../../db/database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type Session, type User } from '../../state/types.js';

/**
 * Users & sessions persistence.
 */
export class UserRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  createUser(email: string, passwordHash: string, displayName: string): User {
    const result = this.db.raw
      .prepare('INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)')
      .run(email, passwordHash, displayName, nowIso());
    const user: User = {
      id: Number(result.lastInsertRowid),
      email,
      passwordHash,
      displayName,
      createdAt: nowIso(),
    };
    this.state.putUser(user);
    return user;
  }

  getById(id: number): User | null {
    return this.state.getUserById(id);
  }

  getByEmail(email: string): User | null {
    return this.state.getUserByEmail(email);
  }

  getUserById(id: number): User | null {
    return this.state.getUserById(id);
  }

  createSession(userId: number, token: string, expiresAt: string): Session {
    const result = this.db.raw
      .prepare('INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(userId, token, nowIso(), expiresAt);
    const session: Session = {
      id: Number(result.lastInsertRowid),
      userId,
      token,
      createdAt: nowIso(),
      expiresAt,
    };
    this.state.putSession(session);
    return session;
  }

  getSessionByToken(token: string): Session | null {
    return this.state.getSessionByToken(token);
  }

  deleteSession(token: string): void {
    this.db.raw.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    this.state.deleteSession(token);
  }

  getUserBySessionToken(token: string): User | null {
    const session = this.state.getSessionByToken(token);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return this.state.getUserById(session.userId) ?? null;
  }
}
