import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../helpers/app-deps.js';
import { startRssServer } from '../mocks/rss-server.js';
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
  let sentMessages: Array<{ channelId: string; payload: { content?: string; embeds?: Array<{ title?: string }> } }>;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    rss = await startRssServer(RSS);
    sentMessages = [];
    ctx.deps.feeds.setBot({
      sendChannelMessage: async (channelId: string, payload: { content?: string; embeds?: unknown[] }) => {
        sentMessages.push({ channelId, payload: payload as { content?: string; embeds?: Array<{ title?: string }> } });
      },
    });
  });

  afterEach(async () => {
    rss.close();
    await ctx.cleanup();
  });

  it('polls a feed and delivers to a Discord channel', async () => {
    const user = ctx.deps.repo.createUser('user@example.com', 'hash', 'User');
    ctx.deps.repo.addFeed(user.id, 'integration', rss.url, '123456789012345678', 'rss', null);

    await ctx.deps.feeds.pollAllFeeds();

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.channelId).toBe('123456789012345678');
    expect(sentMessages[0]?.payload.embeds?.[0]?.title).toBe('New Entry');
  });

  it('deduplicates entries on second poll', async () => {
    const user = ctx.deps.repo.createUser('user@example.com', 'hash', 'User');
    ctx.deps.repo.addFeed(user.id, 'integration', rss.url, '123456789012345678', 'rss', null);

    await ctx.deps.feeds.pollAllFeeds(true);
    await ctx.deps.feeds.pollAllFeeds(true);

    expect(sentMessages).toHaveLength(1);
  });

  it('skips automatic polling if polled within the last hour unless forced', async () => {
    const user = ctx.deps.repo.createUser('user2@example.com', 'hash', 'User 2');
    const feed = ctx.deps.repo.addFeed(user.id, 'hourly-test', rss.url, '123456789012345678', 'rss', null);

    // First automatic poll succeeds
    await ctx.deps.feeds.pollAllFeeds();
    expect(sentMessages).toHaveLength(1);

    // Second automatic poll within the hour is skipped
    await ctx.deps.feeds.pollAllFeeds();
    expect(sentMessages).toHaveLength(1);

    // Forced poll runs
    await ctx.deps.feeds.pollFeed(user.id, feed.id, true);
    expect(sentMessages).toHaveLength(1);
  });
});
