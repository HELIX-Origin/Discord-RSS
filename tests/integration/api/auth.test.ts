import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Auth API', () => {
  let ctx: BuiltAppDeps;
  let client: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('registers and returns a session cookie', async () => {
    const res = await client.post('/api/auth/register', {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(client.cookie).toBeTruthy();
  });

  it('rejects duplicate registration', async () => {
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    const res = await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('logs in with valid credentials', async () => {
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    client.clearCookie();
    const res = await client.post('/api/auth/login', { email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(200);
  });

  it('rejects invalid login', async () => {
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    client.clearCookie();
    const res = await client.post('/api/auth/login', { email: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('handles unauthenticated guest requests appropriately', async () => {
    client.clearCookie();

    // GET / renders landing/dashboard page
    const rootRes = await fetch(`${client['baseUrl']}/`);
    expect(rootRes.status).toBe(200);
    const html = await rootRes.text();
    expect(html).toContain('HELIX');

    // GET /login renders login page
    const loginRes = await fetch(`${client['baseUrl']}/login`);
    expect(loginRes.status).toBe(200);
    const loginHtml = await loginRes.text();
    expect(loginHtml).toContain('Log In');

    // GET /api/auth/me returns unauthenticated for guests
    const meRes = await client.get('/api/auth/me');
    expect(meRes.status).toBe(401);
    const body = meRes.body as { authenticated: boolean };
    expect(body.authenticated).toBe(false);
  });

  it('initiates Discord OAuth login flow', async () => {
    ctx.deps.repo.setSetting('oauth.discord.client_id', 'test-discord-client-id');
    ctx.deps.repo.setSetting('oauth.discord.client_secret', 'test-discord-client-secret');
    ctx.deps.repo.setSetting('oauth.discord.enabled', 'true');

    const res = await client.get<{ url: string }>('/api/auth/discord', {
      headers: { accept: 'application/json' },
    });
    expect(res.status).toBe(200);
    expect(res.body.url).toContain('https://discord.com/oauth2/authorize');
    expect(res.body.url).toContain('client_id=test-discord-client-id');
    expect(res.body.url).toContain('state=');
  });

  it('completes Discord OAuth callback, creates user, and sets session cookie', async () => {
    ctx.deps.repo.setSetting('oauth.discord.client_id', 'test-discord-client-id');
    ctx.deps.repo.setSetting('oauth.discord.client_secret', 'test-discord-client-secret');
    ctx.deps.repo.setSetting('oauth.discord.enabled', 'true');

    const state = 'test-discord-oauth-state-123';
    ctx.deps.repo.saveOAuthState(state, null, 'discord');

    const callbackRes = await fetch(`${client['baseUrl']}/api/auth/callback/discord?code=mock-code&state=${state}`, {
      redirect: 'manual',
    });

    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.get('location')).toBe('/');

    const setCookie = callbackRes.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('drss_session=');

    const createdUser = ctx.deps.repo.getByEmail('discorduser@example.com');
    expect(createdUser).toBeTruthy();
    expect(createdUser?.displayName).toBe('Discord Tester');
    expect(createdUser?.role).toBe('owner'); // First user created is owner

    // Second user created via Discord OAuth receives member role
    const state2 = 'test-discord-oauth-state-456';
    ctx.deps.repo.saveOAuthState(state2, null, 'discord');

    // Simulate different user
    const { mswServer } = await import('../../mocks/msw-server.js');
    const { http, HttpResponse } = await import('msw');
    mswServer.use(
      http.get('https://discord.com/api/v10/users/@me', () => {
        return HttpResponse.json({
          id: '987654321098765432',
          username: 'seconduser',
          discriminator: '0',
          global_name: 'Second Member',
          email: 'second@example.com',
        });
      }),
    );

    const callbackRes2 = await fetch(
      `${client['baseUrl']}/api/auth/callback/discord?code=mock-code-2&state=${state2}`,
      {
        redirect: 'manual',
      },
    );
    expect(callbackRes2.status).toBe(302);

    const memberUser = ctx.deps.repo.getByEmail('second@example.com');
    expect(memberUser).toBeTruthy();
    expect(memberUser?.displayName).toBe('Second Member');
    expect(memberUser?.role).toBe('member');
  });
});
