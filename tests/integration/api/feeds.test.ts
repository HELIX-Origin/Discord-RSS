import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Feeds API', () => {
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

  it('creates and lists feeds', async () => {
    const webhook = await client.post('/api/webhooks', {
      name: 'discord',
      url: 'https://discord.com/api/webhooks/1/token',
    });
    expect(webhook.status).toBe(201);
    const webhookId = (webhook.body as { id: number }).id;

    const feed = await client.post('/api/feeds', {
      name: 'My Feed',
      url: 'https://example.com/feed.xml',
      webhookId,
      feedType: 'rss',
    });
    expect(feed.status).toBe(201);

    const list = await client.get('/api/feeds');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((list.body as Array<{ name: string }>).length).toBe(1);
  });

  it('rejects feed creation without webhook', async () => {
    const res = await client.post('/api/feeds', {
      name: 'My Feed',
      url: 'https://example.com/feed.xml',
      webhookId: 999,
      feedType: 'rss',
    });
    expect(res.status).toBe(400);
  });

  it('rejects feed creation with invalid URL', async () => {
    const res = await client.post('/api/feeds', {
      name: 'Bad Feed',
      url: 'not-a-url',
      webhookId: null,
      feedType: 'rss',
    });
    expect(res.status).toBe(400);
  });
});
