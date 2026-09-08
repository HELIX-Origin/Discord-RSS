import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../helpers/app-deps.js';
import { startRssServer, startWebhookServer } from '../mocks/rss-server.js';
import type { BuiltAppDeps } from '../helpers/app-deps.js';

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Integration Feed</title>
    <link>http://example.com</link>
    <item>
      <title>New Entry</title>
      <link>http://example.com/1</link>
      <guid>entry-1</guid>
      <description>Hello</description>
    </item>
  </channel>
</rss>`;

describe('FeedWatcher integration', () => {
  let ctx: BuiltAppDeps;
  let rss: Awaited<ReturnType<typeof startRssServer>>;
  let webhook: Awaited<ReturnType<typeof startWebhookServer>>;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    [rss, webhook] = await Promise.all([startRssServer(RSS), startWebhookServer()]);
  });

  afterEach(async () => {
    rss.close();
    webhook.close();
    await ctx.cleanup();
  });

  it('polls a feed and delivers to a webhook', async () => {
    const user = ctx.deps.repo.createUser('user@example.com', 'hash', 'User');
    ctx.deps.repo.addWebhook(user.id, 'discord', webhook.url);
    ctx.deps.repo.addFeed(user.id, 'integration', rss.url, 1, 'rss', null);

    await ctx.deps.feeds.pollAllFeeds();

    expect(webhook.deliveries).toHaveLength(1);
    const payload = JSON.parse(webhook.deliveries[0]!.body) as { embeds?: Array<{ title?: string }> };
    expect(payload.embeds?.[0]?.title).toBe('New Entry');
  });

  it('deduplicates entries on second poll', async () => {
    const user = ctx.deps.repo.createUser('user@example.com', 'hash', 'User');
    ctx.deps.repo.addWebhook(user.id, 'discord', webhook.url);
    ctx.deps.repo.addFeed(user.id, 'integration', rss.url, 1, 'rss', null);

    await ctx.deps.feeds.pollAllFeeds();
    await ctx.deps.feeds.pollAllFeeds();

    expect(webhook.deliveries).toHaveLength(1);
  });
});
