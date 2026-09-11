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
    const feed = await client.post('/api/feeds', {
      name: 'My Feed',
      url: 'https://example.com/feed.xml',
      channelId: '123456789012345678',
      feedType: 'rss',
    });
    expect(feed.status).toBe(201);
    expect((feed.body as { channelId: string }).channelId).toBe('123456789012345678');

    const list = await client.get('/api/feeds');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((list.body as Array<{ name: string }>).length).toBe(1);
  });

  it('rejects feed creation with nonexistent webhook id', async () => {
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
      channelId: '123456789012345678',
      feedType: 'rss',
    });
    expect(res.status).toBe(400);
  });
});
