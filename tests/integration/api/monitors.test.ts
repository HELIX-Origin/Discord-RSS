import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Monitors API', () => {
  let ctx: BuiltAppDeps;
  let client: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('creates and lists monitors', async () => {
    const create = await client.post('/api/monitors', { name: 'site', url: 'https://example.com' });
    expect(create.status).toBe(201);

    const list = await client.get('/api/monitors');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((list.body as Array<{ name: string }>)[0]?.name).toBe('site');
  });

  it('rejects monitor without url', async () => {
    const res = await client.post('/api/monitors', { name: 'site' });
    expect(res.status).toBe(400);
  });
});
