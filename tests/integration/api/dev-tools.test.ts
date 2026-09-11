import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Dev Tools API & Pages', () => {
  let ctx: BuiltAppDeps;
  let ownerClient: TestClient;
  let memberClient: TestClient;
  let serverUrl: string;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const owner = ctx.deps.repo.getOrCreateOwnerUser();
    const token = 'test-owner-token';
    ctx.deps.repo.createSession(owner.id, token, new Date(Date.now() + 86400000).toISOString());
    const server = await startAppServer(ctx.deps);
    serverUrl = server.url;
    ownerClient = new TestClient(server.url);
    ownerClient.setSessionToken(token);
    memberClient = new TestClient(server.url);
    await memberClient.post('/api/auth/register', { email: 'member@example.com', password: 'password123' });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('returns comprehensive system stats for owner and admin', async () => {
    const res = await ownerClient.get<{
      feedCount: number;
      webhookCount: number;
      userCount: number;
      adminCount: number;
    }>('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ feedCount: 0, webhookCount: 0 });
    expect(res.body.userCount).toBeGreaterThanOrEqual(1);
    expect(res.body.adminCount).toBeGreaterThanOrEqual(1);
  });

  it('returns Discord bot diagnostics and invite URL', async () => {
    const res = await ownerClient.get<{
      enabled: boolean;
      commands: Array<{ name: string; description: string }>;
    }>('/api/admin/bot');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.commands)).toBe(true);
    expect(res.body.commands.length).toBeGreaterThan(0);
  });

  it('allows owner/admin to optimize SQLite database', async () => {
    const res = await ownerClient.post('/api/admin/db/optimize');
    expect(res.status).toBe(200);
    expect((res.body as { ok: boolean }).ok).toBe(true);
  });

  it('validates test webhook URL', async () => {
    const res = await ownerClient.post('/api/admin/test-webhook', {
      url: 'https://invalid-url.com',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('Invalid Discord webhook URL');
  });

  it('returns activity log for owner/admin', async () => {
    const res = await ownerClient.get('/api/admin/activity?limit=10&level=all');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('allows owner to trigger manual feed poll', async () => {
    const feedRes = await ownerClient.post('/api/admin/trigger-feeds');
    expect(feedRes.status).toBe(202);
  });

  it('forbids member role from accessing dev tools endpoints', async () => {
    const res = await memberClient.get('/api/admin/stats');
    expect(res.status).toBe(403);

    const botRes = await memberClient.get('/api/admin/bot');
    expect(botRes.status).toBe(403);
  });

  it('guards /dev-tools and /settings page routes', async () => {
    // Member session -> 403 Forbidden
    const memberCookie = memberClient.cookie;
    const memberDevRes = await fetch(`${serverUrl}/dev-tools`, {
      headers: memberCookie ? { cookie: memberCookie } : {},
      redirect: 'manual',
    });
    expect(memberDevRes.status).toBe(403);

    const memberSettingsRes = await fetch(`${serverUrl}/settings`, {
      headers: memberCookie ? { cookie: memberCookie } : {},
      redirect: 'manual',
    });
    expect(memberSettingsRes.status).toBe(403);

    // Unauthenticated -> 302 redirect to /login
    const unauthDevRes = await fetch(`${serverUrl}/dev-tools`, { redirect: 'manual' });
    expect(unauthDevRes.status).toBe(302);
    expect(unauthDevRes.headers.get('location')).toBe('/login');

    // Owner -> 302 redirect to /?tab=dev-tools
    const ownerCookie = ownerClient.cookie;
    const ownerDevRes = await fetch(`${serverUrl}/dev-tools`, {
      headers: ownerCookie ? { cookie: ownerCookie } : {},
      redirect: 'manual',
    });
    expect(ownerDevRes.status).toBe(302);
    expect(ownerDevRes.headers.get('location')).toBe('/?tab=dev-tools');

    // Owner -> 302 redirect to /?tab=settings
    const ownerSettingsRes = await fetch(`${serverUrl}/settings`, {
      headers: ownerCookie ? { cookie: ownerCookie } : {},
      redirect: 'manual',
    });
    expect(ownerSettingsRes.status).toBe(302);
    expect(ownerSettingsRes.headers.get('location')).toBe('/?tab=settings');
  });
});
