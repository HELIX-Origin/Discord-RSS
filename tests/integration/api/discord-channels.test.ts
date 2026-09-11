import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Discord Channels API', () => {
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

  it('lists discord channels and bot status', async () => {
    const res = await client.get('/api/discord/channels');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('botEnabled');
    expect(res.body).toHaveProperty('guilds');
  });

  it('requires authentication to access discord channels', async () => {
    const unauthedClient = new TestClient(client.baseUrl);
    const res = await unauthedClient.get('/api/discord/channels');
    expect(res.status).toBe(401);
  });
});
