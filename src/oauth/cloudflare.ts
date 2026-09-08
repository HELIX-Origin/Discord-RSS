import { randomBytes } from 'node:crypto';
import type { OAuthProvider, OAuthProviderConfig, OAuthTokenResponse } from './types.js';

interface TokenSuccess {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface TokenError {
  error: string;
  error_description?: string;
}

function isError(body: unknown): body is TokenError {
  return typeof body === 'object' && body !== null && 'error' in body;
}

export class CloudflareProvider implements OAuthProvider {
  readonly provider = 'cloudflare';

  config(): OAuthProviderConfig {
    return {
      provider: this.provider,
      label: 'Cloudflare',
      description: 'Authenticate to fetch RSS feeds behind Cloudflare Access-protected domains.',
      clientId: '',
      clientSecret: '',
      authorizeUrl: 'https://dash.cloudflare.com/oauth2/auth',
      tokenUrl: 'https://dash.cloudflare.com/oauth2/token',
      scope: 'zone:read',
      enabled: false,
    };
  }

  buildAuthorizeUrl(redirectUri: string, state: string, config: OAuthProviderConfig): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
    });
    return `${config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string, config: OAuthProviderConfig): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        'user-agent': 'DiscordRSS/0.1',
      },
      body,
    });

    const json = (await res.json()) as unknown;
    if (!res.ok || isError(json)) {
      const err = isError(json) ? json.error_description ?? json.error : `HTTP ${res.status}`;
      throw new Error(`Cloudflare OAuth token exchange failed: ${err}`);
    }

    const success = json as TokenSuccess;
    return {
      accessToken: success.access_token,
      refreshToken: success.refresh_token ?? null,
      expiresIn: success.expires_in ?? null,
      accountId: randomBytes(8).toString('hex'),
    };
  }
}