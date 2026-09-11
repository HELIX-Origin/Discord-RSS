import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { buildAppDeps, type BuiltAppDeps } from '../../helpers/app-deps.js';
import { startAppServer, type TestAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import { mswServer } from '../../mocks/msw-server.js';

const CLOUDFLARE_TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';

function mockTokenExchange() {
  mswServer.use(
    http.post(CLOUDFLARE_TOKEN_URL, () =>
      HttpResponse.json(
        {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          scope: 'zone:read',
        },
        { status: 200 },
      ),
    ),
  );
}

describe('Cloudflare OAuth flow', () => {
  let ctx: BuiltAppDeps;
  let server: TestAppServer;
  let client: TestClient;

  beforeEach(async () => {
    mockTokenExchange();
    ctx = await buildAppDeps();
    server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
    await client.post('/api/auth/register', { email: 'oauth@example.com', password: 'password123' });
    const res = await client.post('/api/settings/oauth/cloudflare', {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      enabled: true,
    });
    expect(res.status).toBe(200);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('builds an authorize URL pointing at Cloudflare', async () => {
    const res = await client.get('/api/oauth/cloudflare/connect');
    expect(res.status).toBe(200);
    const url = (res.body as { url: string }).url;
    expect(url.startsWith('https://dash.cloudflare.com/oauth2/auth?')).toBe(true);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBe('test-client');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('zone:read');
    expect(parsed.searchParams.get('redirect_uri')).toContain('/api/oauth/cloudflare/callback');
    expect(parsed.searchParams.get('state')).toBeTruthy();
  });

  it('exchanges the code on callback and stores the connection', async () => {
    const connect = await client.get('/api/oauth/cloudflare/connect');
    const url = (connect.body as { url: string }).url;
    const state = new URL(url).searchParams.get('state')!;

    const callback = await client.get(`/api/oauth/cloudflare/callback?state=${state}&code=mock-code`);
    expect(callback.status).toBe(200);
    expect(callback.raw).toContain('success');

    const me = await client.get('/api/auth/me');
    const connections = (me.body as { connections: Array<{ provider: string }> }).connections;
    expect(connections.some((c) => c.provider === 'cloudflare')).toBe(true);
  });

  it('shows the connected Cloudflare account in dashboard data', async () => {
    const connect = await client.get('/api/oauth/cloudflare/connect');
    const state = new URL((connect.body as { url: string }).url).searchParams.get('state')!;

    await client.get(`/api/oauth/cloudflare/callback?state=${state}&code=mock-code`);

    const settings = await client.get('/api/settings');
    const providers = (
      settings.body as { oauthProviders: Array<{ provider: string; enabled: boolean; configured: boolean }> }
    ).oauthProviders;
    const cf = providers.find((p) => p.provider === 'cloudflare');
    expect(cf?.enabled).toBe(true);
    expect(cf?.configured).toBe(true);
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

    // Non-host user attempting to update OAuth credentials
    const oauthRes = await nonHostClient.post('/api/settings/oauth/cloudflare', {
      clientId: 'hacked',
      clientSecret: 'hacked',
      enabled: false,
    });
    expect(oauthRes.status).toBe(403);
  });

  it('supports secret-less OAuth code exchange when clientSecret is empty or omitted', async () => {
    let capturedBody: string | null = null;
    mswServer.use(
      http.post(CLOUDFLARE_TOKEN_URL, async ({ request }) => {
        capturedBody = await request.text();
        return HttpResponse.json(
          {
            access_token: 'mock-access-token-no-secret',
            expires_in: 3600,
            scope: 'zone:read',
          },
          { status: 200 },
        );
      }),
    );

    // Reconfigure Cloudflare with clientId only (no clientSecret)
    const updateRes = await client.post('/api/settings/oauth/cloudflare', {
      clientId: 'public-client-id',
      clientSecret: '',
      enabled: true,
    });
    expect(updateRes.status).toBe(200);

    const connect = await client.get('/api/oauth/cloudflare/connect');
    expect(connect.status).toBe(200);
    const url = (connect.body as { url: string }).url;
    const parsedUrl = new URL(url);
    expect(parsedUrl.searchParams.get('client_id')).toBe('public-client-id');
    const state = parsedUrl.searchParams.get('state')!;

    const callback = await client.get(`/api/oauth/cloudflare/callback?state=${state}&code=secretless-code`);
    expect(callback.status).toBe(200);
    expect(callback.raw).toContain('success');

    expect(capturedBody).not.toBeNull();
    const params = new URLSearchParams(capturedBody!);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('client_id')).toBe('public-client-id');
    expect(params.get('code')).toBe('secretless-code');
    expect(params.has('client_secret')).toBe(false);

    const me = await client.get('/api/auth/me');
    const connections = (me.body as { connections: Array<{ provider: string }> }).connections;
    expect(connections.some((c) => c.provider === 'cloudflare')).toBe(true);
  });
});
