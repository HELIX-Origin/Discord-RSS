import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startRssServer, startWebhookServer } from '../mocks/rss-server.js';
import { buildAppDeps } from '../helpers/app-deps.js';
import { startAppServer } from '../helpers/server.js';
import { TestClient } from '../helpers/http-client.js';

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Smoke Feed</title>
    <link>http://smoke.example</link>
    <item>
      <title>Smoke entry</title>
      <link>http://smoke.example/1</link>
      <guid>smoke-entry-1</guid>
      <description>This is a smoke test entry.</description>
    </item>
  </channel>
</rss>`;

describe('source smoke', () => {
  let rss: Awaited<ReturnType<typeof startRssServer>>;
  let webhook: Awaited<ReturnType<typeof startWebhookServer>>;
  let client: TestClient;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    [rss, webhook] = await Promise.all([startRssServer(RSS), startWebhookServer()]);
    const ctx = await buildAppDeps();
    cleanup = ctx.cleanup;
    const server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
  }, 15_000);

  afterAll(async () => {
    rss.close();
    webhook.close();
    await cleanup();
  });

  it('health responds with 200', async () => {
    const res = await client.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });

  it('full flow: register -> webhook -> feed -> poll -> delivery', async () => {
    const register = await client.post('/api/auth/register', {
      email: 'smoke@example.com',
      password: 'smokepass123',
    });
    expect(register.status).toBe(201);

    const webhookRes = await client.post('/api/webhooks', { name: 'mock-discord', url: webhook.url });
    expect(webhookRes.status).toBe(201);
    const webhookId = (webhookRes.body as { id: number }).id;

    const feedRes = await client.post('/api/feeds', {
      name: 'Smoke Feed',
      url: rss.url,
      webhookId,
      feedType: 'rss',
    });
    expect(feedRes.status).toBe(201);
    const feedId = (feedRes.body as { id: number }).id;

    const pollRes = await client.post(`/api/feeds/${feedId}/poll`);
    expect(pollRes.status).toBe(200);

    expect(webhook.deliveries.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(webhook.deliveries[0]!.body) as { embeds?: Array<{ title?: string; url?: string }> };
    expect(payload.embeds?.[0]?.title).toBe('Smoke entry');
    expect(payload.embeds?.[0]?.url).toContain('/1');
  }, 30_000);
});
