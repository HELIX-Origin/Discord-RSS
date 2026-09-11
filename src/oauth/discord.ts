import type { OAuthProvider, OAuthProviderConfig, OAuthTokenResponse } from './types.js';

interface DiscordTokenSuccess {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
  verified?: boolean;
}

export interface DiscordProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

export class DiscordProvider implements OAuthProvider {
  readonly provider = 'discord';

  config(): OAuthProviderConfig {
    return {
      provider: this.provider,
      label: 'Discord',
      description: 'Authenticate and log in using your Discord account.',
      clientId: '',
      clientSecret: '',
      authorizeUrl: 'https://discord.com/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/v10/oauth2/token',
      scope: 'identify email guilds',
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
      prompt: 'consent',
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

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json['error']) {
      const err = (json['error_description'] as string) || (json['error'] as string) || `HTTP ${res.status}`;
      throw new Error(`Discord OAuth token exchange failed: ${err}`);
    }

    const success = json as unknown as DiscordTokenSuccess;
    const profile = await this.fetchUserProfile(success.access_token);

    return {
      accessToken: success.access_token,
      refreshToken: success.refresh_token ?? null,
      expiresIn: success.expires_in ?? null,
      accountId: profile.id,
    };
  }

  async fetchUserProfile(accessToken: string): Promise<DiscordProfile> {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'user-agent': 'DiscordRSS/0.1',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Discord user profile: HTTP ${res.status}`);
    }

    const user = (await res.json()) as DiscordUserResponse;
    const displayName = user.global_name || user.username;
    const email = user.email || `${user.username.toLowerCase()}@discord.helix`;

    return {
      id: user.id,
      username: user.username,
      displayName,
      email,
    };
  }

  async fetchUserGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'user-agent': 'DiscordRSS/0.1',
      },
    });

    if (!res.ok) {
      return [];
    }

    return (await res.json()) as DiscordUserGuild[];
  }
}

export interface DiscordUserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export function hasManageChannelsPermission(guild: { owner?: boolean; permissions?: string | number }): boolean {
  if (guild.owner) return true;
  if (!guild.permissions) return false;
  try {
    const perms = BigInt(guild.permissions);
    const ADMINISTRATOR = 1n << 3n;
    const MANAGE_CHANNELS = 1n << 4n;
    return (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_CHANNELS) !== 0n;
  } catch {
    return false;
  }
}
