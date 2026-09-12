/* eslint-disable no-useless-assignment -- accessToken and accessTokenSet are used in template literals */
import type { Repository } from '../db/repository.js';
import type { RedisCoordinator } from '../state/redis.js';
import { feedCategory, type Feed, type FeedCategory } from '../state/types.js';
import { fetchRaw, isCloudflareChallenge } from './fetch.js';
import { fetchFreeGames, type FreeGameItem, type FreeGamePlatformKey } from './freegames.js';
import { parseHtml } from './html.js';
import { parseFeed, withGuid, type FeedEntry } from './parser.js';
import { scrapeItems, absoluteUrl } from './scraper.js';
import { feedEmbed, freeGameEmbed, streamAlertEmbed } from '../bot/embeds.js';
import { createLogger, type LogLevel } from '../util/logger.js';
import { FeedThreadManager } from './threads.js';

interface YouTubeItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    publishedAt?: string;
    channelTitle?: string;
    description?: string;
    thumbnails?: {
      high?: { url?: string };
      default?: { url?: string };
    };
  };
}

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

  private resolveFeedTargets(feed: Feed): { channelId: string | null; threadChannelId: string | null } {
    const category = feed.guildId ? (feedCategory(feed.feedType) as FeedCategory | null) : null;
    const target = category && feed.guildId ? this.repo.getGuildCategoryTarget(feed.guildId, category) : null;
    return {
      channelId: target?.channelId ?? feed.channelId ?? null,
      threadChannelId: target?.threadChannelId ?? feed.threadChannelId ?? null,
    };
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

    const { channelId: targetChannelId, threadChannelId: targetThreadChannelId } = this.resolveFeedTargets(feed);
    if (!targetChannelId && !targetThreadChannelId) {
      this.logger.warn('Feed has no configured Discord channel and no category target; skipping poll', {
        feedId: feed.id,
        feedName: feed.name,
      });
      return;
    }

    const isFreeGamesFeed = feed.feedType === 'free_games' || feed.feedType?.startsWith('free_games');
    const isYouTubeFeed = feed.feedType === 'youtube';
    const isTwitchFeed = feed.feedType === 'twitch';

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

    // YouTube and Twitch feeds are primarily handled via webhooks
    // But we also poll periodically as a fallback
    if (isYouTubeFeed || isTwitchFeed) {
      await this.pollStreamAlertFeed(userId, feed);
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
    const { channelId } = this.resolveFeedTargets(feed);
    if (!this.bot || !channelId) return false;
    await this.bot.sendChannelMessage(channelId, payload);
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

  private async pollStreamAlertFeed(userId: number, feed: Feed): Promise<void> {
    this.logger.debug('Polling stream alert feed (fallback)', { feedId: feed.id, feedType: feed.feedType });

    const { channelId, threadChannelId } = this.resolveFeedTargets(feed);
    if (!channelId && !threadChannelId) {
      this.logger.warn('Stream alert feed has no configured Discord channel or thread target; skipping poll', {
        feedId: feed.id,
        feedName: feed.name,
      });
      return;
    }

    let entries: Array<{
      id: string;
      title: string;
      link: string;
      publishedAt: string;
      author?: string;
      description?: string;
      imageUrl?: string;
    }> = [];

    if (feed.feedType === 'youtube') {
      entries = await this.fetchYouTubeFeed(feed);
    } else if (feed.feedType === 'twitch') {
      entries = await this.fetchTwitchFeed(feed);
    }

    const toSend: Array<{
      id: string;
      title: string;
      link: string;
      publishedAt: string;
      author?: string;
      description?: string;
      imageUrl?: string;
    }> = [];
    for (const entry of entries) {
      if (this.repo.isEntrySent(feed.id, entry.id)) continue;
      if (this.redis && (await this.redis.isEntrySent(feed.id, entry.id))) continue;
      toSend.push(entry);
    }

    for (const entry of toSend) {
      const embed = streamAlertEmbed({
        title: entry.title,
        url: entry.link,
        description: entry.description,
        author: entry.author,
        publishedAt: entry.publishedAt,
        feedTitle: feed.name,
        color: feed.feedType === 'twitch' ? 0x9146ff : feed.feedType === 'youtube' ? 0xff0000 : 0x06b6d4,
        imageUrl: entry.imageUrl,
        feedType: feed.feedType,
        brandIconUrl: null,
      });
      let delivered = false;
      let errorDetail: string | null = null;

      try {
        delivered = await this.deliverEntry(feed, { embeds: [embed] });
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : String(err);
      }

      if (delivered) {
        this.repo.markEntrySent(feed.id, entry.id);
        await this.redis?.markEntrySent(feed.id, entry.id);
      } else {
        this.logger.warn('Delivery failed for stream alert entry', {
          feedId: feed.id,
          entryId: entry.id,
          entryTitle: entry.title,
          error: errorDetail,
        });
        break;
      }
    }

    this.repo.setFeedChecked(userId, feed.id, entries.length ? entries[0].id : feed.lastEntryId);
    this.logger.info('Stream alert feed polled', { feedId: feed.id, feedName: feed.name, newEntries: toSend.length });
  }

  private async fetchYouTubeFeed(feed: Feed): Promise<
    Array<{
      id: string;
      title: string;
      link: string;
      publishedAt: string;
      author?: string;
      description?: string;
      imageUrl?: string;
    }>
  > {
    const apiKey = process.env['YOUTUBE_API_KEY'];
    if (!apiKey) {
      this.logger.warn('YouTube API key not configured, skipping YouTube feed', { feedId: feed.id });
      return [];
    }

    const channelIdMatch = feed.url.match(/(?:channel\/|user\/|c\/|@)([^/?]+)/);
    const channelId = channelIdMatch?.[1] || feed.url;

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn('YouTube API request failed', { feedId: feed.id, status: response.status });
        return [];
      }
      const data = await response.json();

      return (data.items || []).map((item: YouTubeItem) => {
        const videoId = item.id?.videoId || item.id || '';
        return {
          id: videoId,
          title: item.snippet?.title || 'New Video',
          link: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          author: item.snippet?.channelTitle,
          description: item.snippet?.description,
          imageUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        };
      });
    } catch (err) {
      this.logger.error('Failed to fetch YouTube feed', { feedId: feed.id }, err);
      return [];
    }
  }

  private async fetchTwitchFeed(feed: Feed): Promise<
    Array<{
      id: string;
      title: string;
      link: string;
      publishedAt: string;
      author?: string;
      description?: string;
      imageUrl?: string;
    }>
  > {
    const clientId = process.env['TWITCH_CLIENT_ID'];
    const clientSecret = process.env['TWITCH_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      this.logger.warn('Twitch credentials not configured, skipping Twitch feed', { feedId: feed.id });
      return [];
    }

    let accessToken: string | null = null;
    let accessTokenSet = false;
    try {
      const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      accessTokenSet = true;
    } catch (err) {
      this.logger.error('Failed to get Twitch access token', { feedId: feed.id }, err);
      return [];
    }

    if (!accessToken || !accessTokenSet) return [];

    const channelMatch = feed.url.match(/twitch\.tv\/([^/?]+)/);
    const channelName = channelMatch?.[1] || feed.url;

    try {
      const url = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
      const response = await fetch(url, {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        this.logger.warn('Twitch API request failed', { feedId: feed.id, status: response.status });
        return [];
      }

      const data = await response.json();

      return (data.data || []).map(
        (stream: {
          id: string;
          user_name: string;
          title: string;
          user_login: string;
          started_at: string;
          thumbnail_url?: string;
        }) => ({
          id: stream.id,
          title: `${stream.user_name} is live: ${stream.title}`,
          link: `https://twitch.tv/${stream.user_login}`,
          publishedAt: stream.started_at,
          author: stream.user_name,
          description: stream.title,
          imageUrl: stream.thumbnail_url?.replace('{width}', '1280').replace('{height}', '720'),
        }),
      );
    } catch (err) {
      this.logger.error('Failed to fetch Twitch feed', { feedId: feed.id }, err);
      return [];
    }
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
