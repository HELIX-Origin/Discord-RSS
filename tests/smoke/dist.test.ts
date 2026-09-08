import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startRssServer, startWebhookServer } from '../mocks/rss-server.js';
import { startAppServer } from '../helpers/server.js';
import { TestClient } from '../helpers/http-client.js';
import { Database } from '../../dist/db/database.js';
import { Repository } from '../../dist/db/repository.js';
import { FeedWatcher } from '../../dist/feed/watcher.js';
import { OAuthService } from '../../dist/oauth/service.js';
import { StatusWatcher } from '../../dist/status/watcher.js';
import { getTestDataDir } from '../helpers/db.js';
import { resolve } from 'node:path';

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

const config = {
  host: '127.0.0.1',
  port: 0,
  dbPath: resolve(getTestDataDir(), `dist-smoke-${Date.now()}.db`),
  pollIntervalMs: 3_600_000,
  statusIntervalMs: 3_600_000,
  requestTimeoutMs: 15_000,
  publicBaseUrl: null,
  redisUrl: null,
  logLevel: 'error' as const,
};

describe('dist smoke', () => {
  let rss: Awaited<ReturnType<typeof startRssServer>>;
  let webhook: Awaited<ReturnType<typeof startWebhookServer>>;
  let client: TestClient;
  let db: Database;

  beforeAll(async () => {
    [rss, webhook] = await Promise.all([startRssServer(RSS), startWebhookServer()]);
    db = Database.open(config.dbPath, config.logLevel);
    const repo = new Repository(db);
    const oauth = new OAuthService(repo);
    const feeds = new FeedWatcher(repo, null, config.logLevel);
    const status = new StatusWatcher(repo, null, config.logLevel);
    const deps = { config, db, repo, oauth, feeds, status, redis: null };
    const server = await startAppServer(deps as never);
    client = new TestClient(server.url);
  }, 15_000);

  afterAll(async () => {
    rss.close();
    webhook.close();
    db.close();
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
  }, 30_000);
});
