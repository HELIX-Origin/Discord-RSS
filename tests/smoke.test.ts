import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defaultConfig, type AppConfig } from '../src/config.js';
import { Database } from '../src/db/database.js';
import { Repository } from '../src/db/repository.js';
import { FeedWatcher } from '../src/feed/watcher.js';
import { OAuthService } from '../src/oauth/service.js';
import { createDiscordRssServer } from '../src/server.js';
import { createRedisCoordinator } from '../src/state/redis.js';
import { StatusWatcher } from '../src/status/watcher.js';
import type { Server } from 'node:http';
import { testDbPath } from './test-helpers.js';

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
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

interface MockServer {
  url: string;
  close: () => void;
}

function startMockServer(handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void): Promise<MockServer> {
  return new Promise((resolve, reject) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
    server.on('error', reject);
  });
}

function startRssServer(): Promise<MockServer> {
  return startMockServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8' });
    res.end(RSS_XML);
  });
}

interface WebhookMock extends MockServer {
  deliveries: Array<{ headers: import('node:http').IncomingHttpHeaders; body: string }>;
}

function startWebhookServer(): Promise<WebhookMock> {
  const deliveries: WebhookMock['deliveries'] = [];
  return startMockServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      deliveries.push({ headers: req.headers, body });
      res.writeHead(204);
      res.end();
    });
  }).then((server) => ({ ...server, deliveries }));
}

describe('smoke', () => {
  let appServer: Server;
  let baseUrl: string;
  let db: Database;
  let rss: MockServer;
  let webhook: WebhookMock;
  const jar = new Map<string, string>();

  beforeAll(async () => {
    [rss, webhook] = await Promise.all([startRssServer(), startWebhookServer()]);

    const config: AppConfig = {
      ...defaultConfig(),
      port: 0,
      host: '127.0.0.1',
      pollIntervalMs: 3_600_000,
      statusIntervalMs: 3_600_000,
    };

    db = Database.open(testDbPath('smoke'), config.logLevel);
    const repo = new Repository(db);
    const oauth = new OAuthService(repo);
    const redis = await createRedisCoordinator(null);
    const feeds = new FeedWatcher(repo, redis, config.logLevel);
    const status = new StatusWatcher(repo, redis, config.logLevel);

    appServer = createDiscordRssServer({ config, db, repo, oauth, feeds, status, redis });
    await new Promise<void>((resolve) => {
      appServer.listen(config.port, config.host, () => {
        const address = appServer.address();
        const port = typeof address === 'object' && address ? address.port : config.port;
        baseUrl = `http://${config.host}:${port}`;
        resolve();
      });
    });
  }, 15_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => appServer.close(() => resolve()));
    db.close();
    rss.close();
    webhook.close();
  });

  async function api(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    const cookie = jar.get('session');
    if (cookie) headers.cookie = cookie;
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, init);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) jar.set('session', setCookie.split(';')[0]);
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  }

  it('health responds with 200', async () => {
    const res = await api('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });

  it('full flow: register -> webhook -> feed -> poll -> delivery', async () => {
    const register = await api('POST', '/api/auth/register', {
      email: 'smoke@example.com',
      password: 'smokepass123',
      displayName: 'Smoke User',
    });
    expect(register.status).toBe(201);

    const webhookRes = await api('POST', '/api/webhooks', { name: 'mock-discord', url: webhook.url });
    expect(webhookRes.status).toBe(201);
    const webhookId = (webhookRes.body as { id: number }).id;

    const feedRes = await api('POST', '/api/feeds', {
      name: 'Smoke Feed',
      url: rss.url,
      webhookId,
      feedType: 'rss',
    });
    expect(feedRes.status).toBe(201);
    const feedId = (feedRes.body as { id: number }).id;

    const pollRes = await api('POST', `/api/feeds/${feedId}/poll`);
    expect(pollRes.status).toBe(200);

    expect(webhook.deliveries.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(webhook.deliveries[0].body) as {
      embeds?: Array<{ title?: string; url?: string }>;
    };
    expect(payload.embeds).toBeDefined();
    expect(payload.embeds!.length).toBeGreaterThan(0);
    expect(payload.embeds![0].title).toBe('Smoke entry');
    expect(payload.embeds![0].url).toContain('/1');
  }, 30_000);
});