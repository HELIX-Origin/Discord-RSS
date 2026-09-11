import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps, type BuiltAppDeps } from '../../helpers/app-deps.js';
import { startAppServer, type TestAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';

describe('OAuth routes and error handling', () => {
  let ctx: BuiltAppDeps;
  let server: TestAppServer;
  let client: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps({
      config: {
        clientId: 'discord-test-client',
        clientSecret: 'discord-test-secret',
      },
    });
    server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
    await client.post('/api/auth/register', { email: 'oauth@example.com', password: 'password123' });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('renders /oauth/error HTML page with error description and status 200', async () => {
    const res = await client.get('/oauth/error?error=access_denied&error_description=The+user+denied+access');
    expect(res.status).toBe(200);
    expect(res.raw).toContain('Authentication could not be completed');
    expect(res.raw).toContain('The user denied access');
    expect(res.raw).toContain('Return to Dashboard');
  });

  it('renders /api/oauth/error HTML page with status 200', async () => {
    const res = await client.get('/api/oauth/error?error=invalid_request&error_description=Missing+parameters');
    expect(res.status).toBe(200);
    expect(res.raw).toContain('Authentication could not be completed');
    expect(res.raw).toContain('Missing parameters');
  });

  it('returns 400 when attempting to update OAuth credentials via API', async () => {
    const res = await client.post('/api/settings/oauth/discord', {
      clientId: 'injected-client-id',
      enabled: true,
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain(
      'OAuth provider credentials cannot be configured via the dashboard',
    );
  });

  it('returns 400 when connecting to retired Cloudflare OAuth provider', async () => {
    const res = await client.get('/api/oauth/cloudflare/connect');
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('Unknown OAuth provider: cloudflare');
  });

  it('builds an authorize URL for Discord provider when configured in env', async () => {
    const res = await client.get('/api/oauth/discord/connect');
    expect(res.status).toBe(200);
    const url = (res.body as { url: string }).url;
    expect(url.startsWith('https://discord.com/oauth2/authorize?')).toBe(true);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBe('discord-test-client');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('redirect_uri')).toContain('/api/auth/callback/discord');
    expect(parsed.searchParams.get('state')).toBeTruthy();
  });

  it('restricts /api/settings to host/owner only and forbids non-host users', async () => {
    // Register a secondary non-host user
    const nonHostClient = new TestClient(server.url);
    await nonHostClient.post('/api/auth/register', { email: 'user2@example.com', password: 'password123' });

    // Non-host user attempting to GET settings
    const getRes = await nonHostClient.get('/api/settings');
    expect(getRes.status).toBe(403);

    // Non-host user attempting to POST settings
    const postRes = await nonHostClient.post('/api/settings', { publicBaseUrl: 'http://evil.com' });
    expect(postRes.status).toBe(403);
  });
});
