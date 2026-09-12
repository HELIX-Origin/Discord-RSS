import type { Repository } from '../db/repository.js';
import type { RedisCoordinator } from '../state/redis.js';
import type { Feed } from '../state/types.js';
import { fetchRaw, isCloudflareChallenge } from './fetch.js';
import { parseHtml } from './html.js';
import { parseFeed, withGuid, type FeedEntry } from './parser.js';
import { scrapeItems, absoluteUrl } from './scraper.js';
import { feedEmbed } from '../bot/embeds.js';
import { createLogger, type LogLevel } from '../util/logger.js';

export interface ChannelMessageSender {
  sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void>;
}

export class FeedWatcher {
  private readonly logger;

  constructor(
    private readonly repo: Repository,
    private readonly redis: RedisCoordinator | null = null,
    logLevel?: LogLevel,
    private bot?: ChannelMessageSender | null,
  ) {
    this.logger = createLogger('feed', logLevel);
  }

  setBot(bot: ChannelMessageSender | null): void {
    this.bot = bot;
  }

  async pollFeed(userId: number, feedId: number, force = false): Promise<void> {
    const feed = this.repo.getFeed(userId, feedId);
    if (!feed) return;
    if (!feed.enabled) return;

    const lockKey = `feed:${feedId}`;
    if (this.redis && !(await this.redis.acquireLock(lockKey, 60_000))) {
      return; // another instance is polling this feed
    }
    try {
      await this.pollFeedLocked(userId, feed, force);
    } finally {
      await this.redis?.releaseLock(lockKey);
    }
  }

  private getFeedPollIntervalMs(userId: number): number {
    const userSaved = this.repo.getUserSetting(userId, 'poll_interval_ms');
    if (userSaved) {
      const n = Number(userSaved);
      if (Number.isInteger(n) && n > 0) return n;
    }
    const globalSaved = this.repo.getSetting('poll_interval_ms');
    if (globalSaved) {
      const n = Number(globalSaved);
      if (Number.isInteger(n) && n > 0) return n;
    }
    return 3_600_000;
  }

  private async pollFeedLocked(userId: number, feed: Feed, force = false): Promise<void> {
    const minElapsed = this.getFeedPollIntervalMs(userId);
    if (!force && feed.lastCheckedAt) {
      const lastCheck = new Date(feed.lastCheckedAt).getTime();
      if (!Number.isNaN(lastCheck) && Date.now() - lastCheck < minElapsed) {
        this.logger.debug('Skipping feed poll; feed was polled within the configured interval', {
          feedId: feed.id,
          feedName: feed.name,
          lastCheckedAt: feed.lastCheckedAt,
          minElapsed,
        });
        return;
      }
    }

    const targetChannelId = feed.channelId;
    if (!targetChannelId) {
      this.logger.warn('Feed has no configured Discord channel; skipping poll', {
        feedId: feed.id,
        feedName: feed.name,
      });
      return;
    }

    let result;
    try {
      result = await fetchRaw(feed.url);
    } catch (err) {
      this.logger.error('Feed fetch failed', { feedId: feed.id, feedName: feed.name, url: feed.url }, err);
      return;
    }

    if (result.challenged || isCloudflareChallenge(result.contentType, null)) {
      this.logger.warn('Feed returned a Cloudflare challenge; skipping', {
        feedId: feed.id,
        feedName: feed.name,
        url: result.url,
      });
      return;
    }
    if (result.status >= 300) {
      this.logger.warn('Feed returned non-2xx status', {
        feedId: feed.id,
        feedName: feed.name,
        url: result.url,
        status: result.status,
      });
      this.repo.setFeedChecked(userId, feed.id, feed.lastEntryId);
      return;
    }

    const entries: FeedEntry[] = [];

    if (feed.feedType === 'scrape' && feed.scrape) {
      const root = parseHtml(result.text);
      const items = scrapeItems(root, {
        itemSelector: feed.scrape.item,
        titleSelector: feed.scrape.title,
        linkSelector: feed.scrape.link,
        descriptionSelector: feed.scrape.description,
      });
      entries.push(
        ...items.map<FeedEntry>((item, index) => ({
          id: feed.url + '#' + item.url + '#' + index,
          title: item.title,
          link: item.url ? absoluteUrl(feed.url, item.url) : feed.url,
          description: item.description,
          publishedAt: null,
          author: null,
          imageUrl: item.imageUrl
            ? item.imageUrl.startsWith('http')
              ? item.imageUrl
              : absoluteUrl(feed.url, item.imageUrl)
            : null,
        })),
      );
    } else {
      if (!/\b(rss|atom|rdf)\b/i.test(result.text.slice(0, 2048))) {
        this.logger.warn(`Feed "${feed.name}" response does not look like XML (${result.contentType})`);
        return;
      }
      try {
        const parsed = parseFeed(result.text);
        entries.push(...parsed.entries);
      } catch (err) {
        this.logger.error('Feed parse failed', { feedId: feed.id, feedName: feed.name, url: feed.url }, err);
        return;
      }
    }

    const seen = new Set<string>();
    const toSend: Array<FeedEntry & { guid: string }> = [];
    for (const entry of entries) {
      const withId = withGuid({ title: feed.name, link: feed.url, entries: [] }, entry);
      if (seen.has(withId.guid)) continue;
      seen.add(withId.guid);
      if (this.repo.isEntrySent(feed.id, withId.guid)) continue;
      if (this.redis && (await this.redis.isEntrySent(feed.id, withId.guid))) continue;
      toSend.push(withId);
    }
    toSend.reverse(); // oldest first

    for (const entry of toSend) {
      const embed = feedEmbed({
        title: entry.title,
        url: entry.link,
        description: entry.description,
        author: entry.author,
        publishedAt: entry.publishedAt,
        feedTitle: feed.name,
        imageUrl: entry.imageUrl,
        feedType: feed.feedType,
      });

      let delivered = false;
      let errorDetail: string | null = null;

      if (!this.bot) {
        this.logger.warn('Discord bot is offline; skipping channel message delivery', {
          feedId: feed.id,
          channelId: targetChannelId,
        });
        break;
      }

      try {
        await this.bot.sendChannelMessage(targetChannelId, { embeds: [embed] });
        delivered = true;
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : String(err);
      }

      if (delivered) {
        this.repo.markEntrySent(feed.id, entry.guid);
        await this.redis?.markEntrySent(feed.id, entry.guid);
      } else {
        this.logger.warn('Delivery failed for feed entry', {
          feedId: feed.id,
          feedName: feed.name,
          entryGuid: entry.guid,
          error: errorDetail,
        });
        break;
      }
    }

    this.repo.setFeedChecked(
      userId,
      feed.id,
      entries.length ? withGuid({ title: feed.name, link: feed.url, entries: [] }, entries[0]).guid : feed.lastEntryId,
    );
    this.logger.info('Feed polled', { feedId: feed.id, feedName: feed.name, newEntries: toSend.length });
  }

  async pollAllFeeds(force = false): Promise<void> {
    const userIds = new Set<number>();
    const allFeeds: Array<{ userId: number; id: number }> = [];
    for (const feed of this.repo.listFeedsForAllUsers()) {
      if (feed.enabled !== 1) continue;
      userIds.add(feed.userId);
      allFeeds.push({ userId: feed.userId, id: feed.id });
    }
    await Promise.all(allFeeds.map((f) => this.pollFeed(f.userId, f.id, force)));
  }
}
