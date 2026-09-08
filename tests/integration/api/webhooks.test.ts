import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Webhooks API', () => {
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

  it('creates and lists webhooks', async () => {
    const create = await client.post('/api/webhooks', {
      name: 'discord',
      url: 'https://discord.com/api/webhooks/1/token',
    });
    expect(create.status).toBe(201);

    const list = await client.get('/api/webhooks');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((list.body as Array<{ name: string }>)[0]?.name).toBe('discord');
  });

  it('rejects invalid webhook URL', async () => {
    const res = await client.post('/api/webhooks', { name: 'bad', url: 'not-a-url' });
    expect(res.status).toBe(400);
  });
});
