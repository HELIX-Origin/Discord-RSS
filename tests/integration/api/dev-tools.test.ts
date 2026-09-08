import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Dev Tools API', () => {
  let ctx: BuiltAppDeps;
  let client: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
    await client.post('/api/auth/register', { email: 'host@example.com', password: 'password123' });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('returns stats for host', async () => {
    const res = await client.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ feedCount: 0, webhookCount: 0, monitorCount: 0 });
  });

  it('returns activity for host', async () => {
    const res = await client.get('/api/admin/activity?limit=10');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('allows host to trigger feed poll', async () => {
    const res = await client.post('/api/admin/trigger-feeds');
    expect(res.status).toBe(202);
  });

  it('forbids non-host users', async () => {
    await client.post('/api/auth/register', { email: 'other@example.com', password: 'password123' });
    const res = await client.get('/api/admin/stats');
    expect(res.status).toBe(403);
  });
});
