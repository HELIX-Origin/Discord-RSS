import { describe, expect, it } from 'vitest';
import { buildAppDeps } from '../helpers/app-deps.js';
import { withMockRedis } from '../helpers/redis.js';
import { startRssServer } from '../mocks/rss-server.js';

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Redis Feed</title>
    <link>http://example.com</link>
    <item>
      <title>Entry</title>
      <link>http://example.com/1</link>
      <guid>entry-1</guid>
    </item>
  </channel>
</rss>`;

describe('Redis coordination integration', () => {
  it('shares sent-entry dedupe across instances', async () => {
    await withMockRedis(async (url) => {
      const ctx1 = await buildAppDeps({ redisUrl: url });
      const ctx2 = await buildAppDeps({ redisUrl: url });
      const rss = await startRssServer(RSS);
      const sent1: unknown[] = [];
      const sent2: unknown[] = [];
      ctx1.deps.feeds.setBot({
        sendChannelMessage: async (_c, payload) => {
          sent1.push(payload);
        },
      });
      ctx2.deps.feeds.setBot({
        sendChannelMessage: async (_c, payload) => {
          sent2.push(payload);
        },
      });

      try {
        const user = ctx1.deps.repo.createUser('user@example.com', 'hash', 'User');
        ctx1.deps.repo.addFeed(user.id, 'redis-feed', rss.url, 'channel-1', 'rss', null);

        // First instance polls and marks the entry sent in Redis.
        await ctx1.deps.feeds.pollAllFeeds();
        expect(sent1).toHaveLength(1);

        // Second instance sees the same entry as already sent.
        await ctx2.deps.feeds.pollAllFeeds();
        expect(sent2).toHaveLength(0);
      } finally {
        rss.close();
        await ctx1.cleanup();
        await ctx2.cleanup();
      }
    });
  });
});
