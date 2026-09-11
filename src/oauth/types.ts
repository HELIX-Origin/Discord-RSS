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
