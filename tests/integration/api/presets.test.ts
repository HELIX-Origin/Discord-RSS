import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';
import { FEED_PRESETS } from '../../../src/feed/presets.js';

describe('Presets API', () => {
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

  it('returns presets with alreadyAdded flags', async () => {
    const res = await client.get('/api/presets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as Array<unknown>).length).toBe(FEED_PRESETS.length);
    expect((res.body as Array<{ alreadyAdded: boolean }>)[0]).toHaveProperty('alreadyAdded', false);
  });

  it('marks preset as alreadyAdded after adding it as a feed', async () => {
    const webhook = await client.post('/api/webhooks', {
      name: 'discord',
      url: 'https://discord.com/api/webhooks/1/token',
    });
    const webhookId = (webhook.body as { id: number }).id;
    const preset = FEED_PRESETS[0];

    const create = await client.post('/api/feeds', {
      name: preset.name,
      url: preset.url,
      webhookId,
      feedType: 'rss',
    });
    expect(create.status).toBe(201);

    const list = await client.get('/api/presets');
    const updated = (list.body as Array<{ id: string; alreadyAdded: boolean }>).find((p) => p.id === preset.id);
    expect(updated?.alreadyAdded).toBe(true);
  });
});
