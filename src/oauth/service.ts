import { randomBytes } from 'node:crypto';
import type { Repository } from '../db/repository.js';
import { CloudflareProvider } from './cloudflare.js';
import type { OAuthProvider, OAuthProviderConfig } from './types.js';

const STATE_TTL_MS = 10 * 60 * 1000;

function settingKey(provider: string, field: 'client_id' | 'client_secret' | 'enabled'): string {
  return `oauth.${provider}.${field}`;
}

export class OAuthService {
  private readonly providers = new Map<string, OAuthProvider>();

  constructor(private readonly repo: Repository) {
    this.register(new CloudflareProvider());
  }

  register(provider: OAuthProvider): void {
    this.providers.set(provider.provider, provider);
  }

  listProviders(): Array<{
    provider: string;
    label: string;
    description: string;
    configured: boolean;
    enabled: boolean;
  }> {
    return [...this.providers.values()].map((p) => {
      const config = this.getConfig(p.provider);
      return {
        provider: p.provider,
        label: p.config().label,
        description: p.config().description,
        configured: !!config?.clientId && !!config?.clientSecret,
        enabled: config?.enabled ?? false,
      };
    });
  }

  getProvider(name: string): OAuthProvider | null {
    return this.providers.get(name) ?? null;
  }

  getConfig(provider: string): OAuthProviderConfig | null {
    const base = this.providers.get(provider)?.config();
    if (!base) return null;
    return {
      ...base,
      clientId: this.repo.getSetting(settingKey(provider, 'client_id')) ?? '',
      clientSecret: this.repo.getSetting(settingKey(provider, 'client_secret')) ?? '',
      enabled: this.repo.getSetting(settingKey(provider, 'enabled')) === 'true',
    };
  }

  saveConfig(provider: string, fields: { clientId?: string; clientSecret?: string; enabled?: boolean }): void {
    const config = this.getConfig(provider);
    if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);
    if (fields.clientId !== undefined) {
      this.repo.setSetting(settingKey(provider, 'client_id'), fields.clientId);
    }
    if (fields.clientSecret !== undefined) {
      this.repo.setSetting(settingKey(provider, 'client_secret'), fields.clientSecret);
    }
    if (fields.enabled !== undefined) {
      this.repo.setSetting(settingKey(provider, 'enabled'), String(fields.enabled));
    }
  }

  buildAuthorizeUrl(userId: number, provider: string, redirectUri: string): string {
    const p = this.getProvider(provider);
    if (!p) throw new Error(`Unknown OAuth provider: ${provider}`);
    const config = this.getConfig(provider);
    if (!config?.enabled || !config.clientId || !config.clientSecret) {
      throw new Error(`OAuth provider "${provider}" is not configured`);
    }
    const state = randomBytes(16).toString('hex');
    this.repo.saveOAuthState(state, userId, provider);
    this.repo.cleanupExpiredOAuthStates(STATE_TTL_MS);
    return p.buildAuthorizeUrl(redirectUri, state, config);
  }

  async handleCallback(
    state: string,
    code: string,
    redirectUri: string,
  ): Promise<{ userId: number; provider: string }> {
    const ctx = this.repo.consumeOAuthState(state);
    if (!ctx) throw new Error('Invalid or expired OAuth state');

    const p = this.getProvider(ctx.provider);
    if (!p) throw new Error(`Unknown OAuth provider: ${ctx.provider}`);
    const config = this.getConfig(ctx.provider);
    if (!config) throw new Error(`OAuth provider "${ctx.provider}" is not configured`);

    const tokens = await p.exchangeCode(code, redirectUri, config);
    const expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString() : null;

    this.repo.upsertOAuthConnection({
      userId: ctx.userId,
      provider: ctx.provider,
      providerAccountId: tokens.accountId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    });

    return { userId: ctx.userId, provider: ctx.provider };
  }

  disconnect(userId: number, provider: string): void {
    this.repo.deleteOAuthConnection(userId, provider);
  }

  connectionsFor(userId: number) {
    return this.repo.oauthConnectionsFor(userId);
  }
}
