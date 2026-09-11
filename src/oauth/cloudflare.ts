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
      state,
    });
    if (config.scope?.trim()) {
      params.set('scope', config.scope.trim());
    }
    return `${config.authorizeUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string, config: OAuthProviderConfig): Promise<OAuthTokenResponse> {
    const params: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
    };
    if (config.clientSecret?.trim()) {
      params['client_secret'] = config.clientSecret.trim();
    }
    const body = new URLSearchParams(params);

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
      const err = isError(json) ? (json.error_description ?? json.error) : `HTTP ${res.status}`;
      throw new Error(`Cloudflare OAuth token exchange failed: ${err}`);
    }

    const success = json as TokenSuccess;
    const accountId = await fetchCloudflareAccountId(success.access_token);

    return {
      accessToken: success.access_token,
      refreshToken: success.refresh_token ?? null,
      expiresIn: success.expires_in ?? null,
      accountId,
    };
  }
}

/**
 * Fetches the primary Cloudflare account ID for the authenticated user.
 * Falls back to a deterministic SHA-256 hash of the access token if the
 * accounts API call fails (e.g. insufficient scope).
 */
async function fetchCloudflareAccountId(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=1', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      const data = (await res.json()) as { result?: Array<{ id?: string }> };
      const id = data.result?.[0]?.id;
      if (id) return id;
    }
  } catch {
    /* fall through to deterministic fallback */
  }
  // Deterministic fallback: stable hex derived from the access token
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(accessToken).digest('hex').slice(0, 16);
}
