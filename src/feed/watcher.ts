import type { Repository } from '../db/repository.js';
import type { RedisCoordinator } from '../state/redis.js';
import type { Feed } from '../state/types.js';
import { fetchRaw, isCloudflareChallenge } from './fetch.js';
import { parseHtml } from './html.js';
import { parseFeed, stripHtml, withGuid, type FeedEntry } from './parser.js';
import { scrapeItems, absoluteUrl } from './scraper.js';
import { feedEmbed, sendWebhook } from '../webhook/discord.js';

export class FeedWatcher {
  constructor(
    private readonly repo: Repository,
    private readonly redis: RedisCoordinator | null = null,
  ) {}

  async pollFeed(userId: number, feedId: number): Promise<void> {
    const feed = this.repo.getFeed(userId, feedId);
    if (!feed) return;
    if (!feed.enabled) return;

    const lockKey = `feed:${feedId}`;
    if (this.redis && !(await this.redis.acquireLock(lockKey, 60_000))) {
      return; // another instance is polling this feed
    }
    try {
      await this.pollFeedLocked(userId, feed);
    } finally {
      await this.redis?.releaseLock(lockKey);
    }
  }

  private async pollFeedLocked(userId: number, feed: Feed): Promise<void> {
    const webhook = feed.webhookId ? this.repo.getWebhook(userId, feed.webhookId) : null;
    if (!webhook || webhook.enabled === 0) {
      console.warn(`[feed] "${feed.name}" has no enabled webhook; skipping poll`);
      return;
    }

    let result;
    try {
      result = await fetchRaw(feed.url);
    } catch (err) {
      console.error(`[feed] "${feed.name}" fetch failed:`, err instanceof Error ? err.message : err);
      return;
    }

    if (result.challenged || isCloudflareChallenge(result.contentType, null)) {
      console.warn(`[feed] "${feed.name}" returned a Cloudflare challenge (${result.url}); skipping`);
      return;
    }
    if (result.status >= 300) {
      console.warn(`[feed] "${feed.name}" returned HTTP ${result.status}`);
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
        })),
      );
    } else {
      if (!/\b(rss|atom|rdf)\b/i.test(result.text.slice(0, 2048))) {
        console.warn(`[feed] "${feed.name}" response does not look like XML (${result.contentType})`);
        return;
      }
      try {
        const parsed = parseFeed(result.text);
        entries.push(...parsed.entries);
      } catch (err) {
        console.error(`[feed] "${feed.name}" parse failed:`, err instanceof Error ? err.message : err);
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
        description: stripHtml(entry.description),
        author: entry.author,
        publishedAt: entry.publishedAt,
        feedTitle: feed.name,
        color: 0x06b6d4,
      });

      const result = await sendWebhook(webhook.url, {
        username: feed.name.slice(0, 80),
        embeds: [embed],
      });

      if (result.ok) {
        this.repo.markEntrySent(feed.id, entry.guid);
        await this.redis?.markEntrySent(feed.id, entry.guid);
      } else {
        console.warn(`[feed] send to "${feed.name}" failed: ${result.error}`);
        break;
      }
    }

    this.repo.setFeedChecked(userId, feed.id, entries.length ? withGuid({ title: feed.name, link: feed.url, entries: [] }, entries[0]).guid : feed.lastEntryId);
    console.log(`[feed] "${feed.name}": ${toSend.length} new entries delivered`);
  }

  async pollAllFeeds(): Promise<void> {
    const userIds = new Set<number>();
    const allFeeds: Array<{ userId: number; id: number }> = [];
    for (const feed of this.repo.listFeedsForAllUsers()) {
      if (feed.enabled !== 1) continue;
      userIds.add(feed.userId);
      allFeeds.push({ userId: feed.userId, id: feed.id });
    }
    await Promise.all(allFeeds.map((f) => this.pollFeed(f.userId, f.id)));
  }
}