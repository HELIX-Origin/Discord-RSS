import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { buildAppDeps } from '../helpers/app-deps.js';
import { startWebhookServer } from '../mocks/rss-server.js';
import type { BuiltAppDeps } from '../helpers/app-deps.js';

describe('StatusWatcher integration', () => {
  let ctx: BuiltAppDeps;
  let webhook: Awaited<ReturnType<typeof startWebhookServer>>;
  let statusServer = createServer();
  let statusUrl = '';
  let statusCode = 200;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    webhook = await startWebhookServer();
    statusServer = createServer((_req, res) => {
      res.writeHead(statusCode, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    await new Promise<void>((resolve) => {
      statusServer.listen(0, '127.0.0.1', () => {
        const address = statusServer.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        statusUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => statusServer.close(() => resolve()));
    webhook.close();
    await ctx.cleanup();
  });

  it('notifies on down transition', async () => {
    const user = ctx.deps.repo.createUser('user@example.com', 'hash', 'User');
    const wh = ctx.deps.repo.addWebhook(user.id, 'discord', webhook.url);
    ctx.deps.repo.addMonitor(user.id, 'site', statusUrl, wh.id);

    statusCode = 200;
    await ctx.deps.status.checkAllMonitors();
    expect(webhook.deliveries).toHaveLength(0);

    statusCode = 500;
    await ctx.deps.status.checkAllMonitors();
    expect(webhook.deliveries).toHaveLength(1);
    const payload = JSON.parse(webhook.deliveries[0]!.body) as { embeds?: Array<{ title?: string }> };
    expect(payload.embeds?.[0]?.title).toContain('went down');
  });
});
