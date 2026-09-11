import type { Database } from '../database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type OAuthConnection } from '../../state/types.js';

/**
 * OAuth connection state + persisted connections.
 */
export class OAuthRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  oauthConnectionsFor(userId: number): OAuthConnection[] {
    return this.state.oauthConnectionsFor(userId);
  }

  getOAuthConnection(userId: number, provider: string): OAuthConnection | null {
    return this.state.getOAuthConnection(userId, provider);
  }

  upsertOAuthConnection(connection: {
    userId: number;
    provider: string;
    providerAccountId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
  }): void {
    this.db.raw
      .prepare(
        `INSERT INTO oauth_connections (user_id, provider, provider_account_id, access_token, refresh_token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, provider) DO UPDATE SET
           provider_account_id = excluded.provider_account_id,
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           expires_at = excluded.expires_at`,
      )
      .run(
        connection.userId,
        connection.provider,
        connection.providerAccountId,
        connection.accessToken,
        connection.refreshToken,
        connection.expiresAt,
        nowIso(),
      );
    this.state.putOAuthConnection({
      id: this.state.getOAuthConnection(connection.userId, connection.provider)?.id ?? 0,
      userId: connection.userId,
      provider: connection.provider,
      providerAccountId: connection.providerAccountId,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
      createdAt: nowIso(),
    });
  }

  deleteOAuthConnection(userId: number, provider: string): void {
    this.db.raw.prepare('DELETE FROM oauth_connections WHERE user_id = ? AND provider = ?').run(userId, provider);
    this.state.deleteOAuthConnection(userId, provider);
  }

  saveOAuthState(state: string, userId: number | null, provider: string): void {
    const effectiveUserId = userId === 0 ? null : userId;
    this.db.raw
      .prepare('INSERT OR REPLACE INTO oauth_states (state, user_id, provider, created_at) VALUES (?, ?, ?, ?)')
      .run(state, effectiveUserId, provider, nowIso());
    this.state.putOAuthState({ state, userId: effectiveUserId, provider, createdAt: nowIso() });
  }

  consumeOAuthState(state: string): { userId: number | null; provider: string } | null {
    const entry = this.state.getOAuthState(state);
    if (!entry) return null;
    this.db.raw.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
    this.state.deleteOAuthState(state);
    return { userId: entry.userId, provider: entry.provider };
  }

  cleanupExpiredOAuthStates(maxAgeMs: number): void {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const expired = this.state.expireOAuthStates(cutoff);
    if (expired.length === 0) return;
    const stmt = this.db.raw.prepare('DELETE FROM oauth_states WHERE state = ?');
    for (const state of expired) stmt.run(state);
  }
}
