import type { Repository } from '../db/repository.js';
import type { RedisCoordinator } from '../state/redis.js';
import type { Feed } from '../state/types.js';
import { fetchRaw, isCloudflareChallenge } from './fetch.js';
import { fetchFreeGames, type FreeGameItem, type FreeGamePlatformKey } from './freegames.js';
import { parseHtml } from './html.js';
import { parseFeed, withGuid, type FeedEntry } from './parser.js';
import { scrapeItems, absoluteUrl } from './scraper.js';
import { feedEmbed, freeGameEmbed } from '../bot/embeds.js';
import { createLogger, type LogLevel } from '../util/logger.js';
import { FeedThreadManager } from './threads.js';

export interface ChannelMessageSender {
  sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void>;
  getAppIconUrl?(): string | null;
}

export class FeedWatcher {
  private readonly logger;
  private threads: FeedThreadManager | null = null;

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

  setThreads(threads: FeedThreadManager | null): void {
    this.threads = threads;
  }

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

  private async pollFeedLocked(userId: number, feed: Feed): Promise<void> {
    const minElapsed = this.getFeedPollIntervalMs(userId);
    if (feed.lastCheckedAt) {
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
      const canThread = this.threads ? Boolean(await this.threads.forumChannelForFeed(feed)) : false;
      if (!canThread) {
        this.logger.warn('Feed has no configured Discord channel and no thread target; skipping poll', {
          feedId: feed.id,
          feedName: feed.name,
        });
        return;
      }
    }

    const isFreeGamesFeed = feed.feedType === 'free_games' || feed.feedType?.startsWith('free_games');

    // For Free Games feeds: automated polling runs daily (UTC) so limited-time giveaways are not missed.
    if (isFreeGamesFeed) {
      const todayIso = new Date().toISOString().slice(0, 10);
      if (feed.lastCheckedAt && feed.lastCheckedAt.slice(0, 10) === todayIso) {
        this.logger.debug('Skipping free games poll; already polled today', {
          feedId: feed.id,
          feedName: feed.name,
          lastCheckedAt: feed.lastCheckedAt,
        });
        return;
      }

      await this.pollFreeGamesLocked(userId, feed);
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
        brandIconUrl: this.bot?.getAppIconUrl?.() ?? null,
      });

      let delivered = false;
      let errorDetail: string | null = null;

      try {
        delivered = await this.deliverEntry(feed, { embeds: [embed] });
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

  private async deliverEntry(feed: Feed, payload: { content?: string; embeds?: unknown[] }): Promise<boolean> {
    if (this.threads) {
      const outcome = await this.threads.deliver(feed, payload);
      if (outcome.mode === 'thread') return outcome.delivered;
    }
    if (!this.bot || !feed.channelId) return false;
    await this.bot.sendChannelMessage(feed.channelId, payload);
    return true;
  }

  private async pollFreeGamesLocked(userId: number, feed: Feed): Promise<void> {
    let platformKey: FreeGamePlatformKey = 'all';
    const lowerName = feed.name.toLowerCase();
    const lowerUrl = feed.url.toLowerCase();

    if (feed.feedType === 'free_games_epic' || lowerName.includes('epic') || lowerUrl.includes('epic')) {
      platformKey = 'epic';
    } else if (feed.feedType === 'free_games_steam' || lowerName.includes('steam') || lowerUrl.includes('steam')) {
      platformKey = 'steam';
    } else if (feed.feedType === 'free_games_gog' || lowerName.includes('gog') || lowerUrl.includes('gog')) {
      platformKey = 'gog';
    } else if (
      feed.feedType === 'free_games_indiegala' ||
      lowerName.includes('indiegala') ||
      lowerUrl.includes('indiegala')
    ) {
      platformKey = 'indiegala';
    } else if (feed.feedType === 'free_games_humble' || lowerName.includes('humble') || lowerUrl.includes('humble')) {
      platformKey = 'humble';
    } else if (feed.feedType === 'free_games_itchio' || lowerName.includes('itch') || lowerUrl.includes('itch')) {
      platformKey = 'itchio';
    } else if (
      feed.feedType === 'free_games_ubisoft' ||
      lowerName.includes('ubisoft') ||
      lowerUrl.includes('ubisoft')
    ) {
      platformKey = 'ubisoft';
    } else if (feed.feedType === 'free_games_ea' || lowerName.includes('ea') || lowerUrl.includes('origin')) {
      platformKey = 'ea';
    } else if (feed.feedType === 'free_games_prime' || lowerName.includes('prime') || lowerUrl.includes('prime')) {
      platformKey = 'prime';
    } else if (
      feed.feedType === 'free_games_battlenet' ||
      lowerName.includes('battle.net') ||
      lowerUrl.includes('battlenet')
    ) {
      platformKey = 'battlenet';
    }

    let games: FreeGameItem[];
    try {
      games = await fetchFreeGames(platformKey);
    } catch (err) {
      this.logger.error('Failed to fetch free games', { feedId: feed.id, platformKey }, err);
      return;
    }

    const toSend = [];
    for (const game of games) {
      if (this.repo.isEntrySent(feed.id, game.id)) continue;
      if (this.redis && (await this.redis.isEntrySent(feed.id, game.id))) continue;
      toSend.push(game);
    }

    for (const game of toSend) {
      const embed = freeGameEmbed(game, feed.name);
      let delivered = false;
      let errorDetail: string | null = null;

      try {
        delivered = await this.deliverEntry(feed, { embeds: [embed] });
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : String(err);
      }

      if (delivered) {
        this.repo.markEntrySent(feed.id, game.id);
        await this.redis?.markEntrySent(feed.id, game.id);
      } else {
        this.logger.warn('Delivery failed for free game entry', {
          feedId: feed.id,
          gameId: game.id,
          gameTitle: game.title,
          error: errorDetail,
        });
        break;
      }
    }

    this.repo.setFeedChecked(userId, feed.id, games.length ? games[0].id : feed.lastEntryId);
    this.logger.info('Free games feed polled', { feedId: feed.id, feedName: feed.name, newEntries: toSend.length });
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
