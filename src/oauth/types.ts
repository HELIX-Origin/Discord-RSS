export interface OAuthProviderConfig {
  provider: string;
  label: string;
  description: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  enabled: boolean;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  accountId: string;
}

export interface OAuthProvider {
  readonly provider: string;
  config(): OAuthProviderConfig;
  buildAuthorizeUrl(redirectUri: string, state: string, config: OAuthProviderConfig): string;
  exchangeCode(code: string, redirectUri: string, config: OAuthProviderConfig): Promise<OAuthTokenResponse>;
}

export class ConfiguredOAuthError extends Error {}

export function requireProviderConfig(connector: OAuthConnector, provider: string): OAuthProviderConfig {
  const config = connector.getProviderConfig(provider);
  if (!config) {
    throw new ConfiguredOAuthError(
      `OAuth provider "${provider}" is not available. Configure its credentials in Settings first.`,
    );
  }
  if (!config.enabled) {
    throw new ConfiguredOAuthError(`OAuth provider "${provider}" is disabled. Enable it in Settings first.`);
  }
  if (!config.clientId || !config.clientSecret) {
    throw new ConfiguredOAuthError(
      `OAuth provider "${provider}" is not configured. Set its Client ID and Client Secret in Settings.`,
    );
  }
  return config;
}

export interface OAuthConnector {
  getProviderConfig(provider: string): OAuthProviderConfig | null;
  allProviders(): string[];
}

export interface OAuthStore {
  getClientConfig(provider: string): OAuthProviderConfig | null;
}
