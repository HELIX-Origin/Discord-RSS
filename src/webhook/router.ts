import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppDeps } from '../app.js';
import { createLogger, type LogLevel } from '../util/logger.js';
import type { Feed, FeedType } from '../state/types.js';
import { parseFeed, type FeedEntry } from '../feed/parser.js';
import { streamAlertEmbed, feedEmbed } from '../bot/embeds.js';

export interface WebhookConfig {
  secret: string;
  hubMode: string;
  hubChallenge: string;
  hubTopic: string;
  hubLeaseSeconds?: string;
}

export interface WebhookSubscription {
  feedId: number;
  topic: string;
  callbackUrl: string;
  secret: string;
  expiresAt: number;
  verified: boolean;
}

export class WebhookRouter {
  private readonly logger;
  private subscriptions = new Map<string, WebhookSubscription>();
  private readonly deps: AppDeps;
  private readonly baseUrl: string;

  constructor(deps: AppDeps, logLevel?: LogLevel) {
    this.logger = createLogger('webhook', logLevel);
    this.deps = deps;
    this.baseUrl = deps.config.publicBaseUrl || `http://${deps.config.host}:${deps.config.port}`;
  }

  async handleVerification(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const mode = url.searchParams.get('hub.mode');
    const challenge = url.searchParams.get('hub.challenge');
    const topic = url.searchParams.get('hub.topic');
    const leaseSeconds = url.searchParams.get('hub.lease_seconds');

    if (mode === 'subscribe' && challenge && topic) {
      const subscription = this.subscriptions.get(topic);
      if (subscription && !subscription.verified) {
        subscription.verified = true;
        subscription.expiresAt = Date.now() + parseInt(leaseSeconds || '86400') * 1000;

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(challenge);
        this.logger.info('PubSubHubbub subscription verified', { topic });
        return true;
      }
    } else if (mode === 'unsubscribe' && challenge && topic) {
      const subscription = this.subscriptions.get(topic);
      if (subscription) {
        subscription.verified = false;
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(challenge);
        this.logger.info('PubSubHubbub subscription unsubscribed', { topic });
        return true;
      }
    }
    return false;
  }

  async handleNotification(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const topic = url.searchParams.get('hub.topic') || '';

    const subscription = this.subscriptions.get(topic);
    if (!subscription) {
      this.logger.warn('Webhook notification for unknown topic', { topic });
      res.writeHead(404);
      res.end();
      return false;
    }

    if (!subscription.verified) {
      this.logger.warn('Webhook notification for unverified subscription', { topic });
      res.writeHead(400);
      res.end();
      return false;
    }

    const signature = (req.headers['x-hub-signature'] || req.headers['x-hub-signature-256'] || [''])[0] as string;
    const body = await this.readBody(req);

    if (!this.verifySignature(subscription.secret, body, signature)) {
      this.logger.warn('Invalid webhook signature', { topic });
      res.writeHead(401);
      res.end();
      return false;
    }

    try {
      const feed = this.deps.repo.getFeedByUrl(subscription.topic);
      if (!feed) {
        this.logger.warn('Feed not found for webhook topic', { topic });
        res.writeHead(404);
        res.end();
        return false;
      }

      const entries = await this.parseFeedContent(body, feed.feedType);
      for (const entry of entries) {
        await this.processEntry(feed, entry);
      }

      res.writeHead(200);
      res.end();
      return true;
    } catch (err) {
      this.logger.error('Error processing webhook notification', { topic, error: (err as Error).message });
      res.writeHead(500);
      res.end();
      return false;
    }
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  }

  private verifySignature(secret: string, body: string, signature: string): boolean {
    const expected =
      'sha256=' +
      createHash('sha256')
        .update(secret + body)
        .digest('hex');
    if (signature.startsWith('sha256=')) {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
    return false;
  }

  private async parseFeedContent(body: string, feedType: FeedType): Promise<FeedEntry[]> {
    switch (feedType) {
      case 'youtube': {
        return this.parseYouTubeContent(body);
      }
      case 'twitch': {
        return this.parseTwitchContent(body);
      }
      case 'rss':
      case 'scrape':
      case 'reddit':
      default: {
        const parsed = parseFeed(body);
        return parsed.entries;
      }
    }
  }

  private parseYouTubeContent(body: string): FeedEntry[] {
    try {
      const data = JSON.parse(body);
      const entries: FeedEntry[] = [];

      if (data.items) {
        for (const item of data.items) {
          if (item.snippet) {
            entries.push({
              id: item.id.videoId || item.id,
              title: item.snippet.title,
              link: `https://www.youtube.com/watch?v=${item.id.videoId || item.id}`,
              publishedAt: item.snippet.publishedAt,
              author: item.snippet.channelTitle,
              description: item.snippet.description,
              imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            });
          }
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  private parseTwitchContent(body: string): FeedEntry[] {
    try {
      const data = JSON.parse(body);
      const entries: FeedEntry[] = [];

      if (data.data) {
        for (const stream of data.data) {
          entries.push({
            id: stream.id,
            title: `${stream.user_name} is live: ${stream.title}`,
            link: `https://twitch.tv/${stream.user_login}`,
            publishedAt: stream.started_at,
            author: stream.user_name,
            description: stream.title,
            imageUrl: stream.thumbnail_url?.replace('{width}', '1280').replace('{height}', '720'),
          });
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  private async processEntry(feed: Feed, entry: FeedEntry): Promise<void> {
    const guid = entry.id || entry.link;
    if (!guid) return;

    const isDuplicate = this.deps.repo.isEntrySent(feed.id, guid);
    if (isDuplicate) return;

    const embed =
      feed.feedType === 'youtube' || feed.feedType === 'twitch'
        ? streamAlertEmbed({
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
          })
        : feedEmbed({
            title: entry.title,
            url: entry.link,
            description: entry.description,
            author: entry.author,
            publishedAt: entry.publishedAt,
            feedTitle: feed.name,
            imageUrl: entry.imageUrl,
            feedType: feed.feedType,
            brandIconUrl: null,
          });

    await this.deliverToTargets(feed, embed);
    this.deps.repo.markEntrySent(feed.id, guid);
  }

  private async deliverToTargets(feed: Feed, embed: unknown): Promise<void> {
    const targets = this.getDeliveryTargets(feed);
    for (const target of targets) {
      try {
        if (this.deps.bot) {
          await this.deps.bot.sendChannelMessage(target, { embeds: [embed] });
        }
      } catch (err) {
        this.logger.error('Failed to deliver webhook entry', { feedId: feed.id, error: (err as Error).message });
      }
    }
  }

  private getDeliveryTargets(feed: Feed): string[] {
    const targets: string[] = [];
    if (feed.channelId) targets.push(feed.channelId);
    if (feed.threadChannelId) targets.push(feed.threadChannelId);
    return targets;
  }

  async subscribeToFeed(feed: Feed): Promise<boolean> {
    const topic = this.getTopicForFeed(feed);
    if (!topic) return false;

    const callbackUrl = `${this.baseUrl}/webhook/callback`;
    const secret = this.generateSecret();

    const subscription: WebhookSubscription = {
      feedId: feed.id,
      topic: feed.url,
      callbackUrl,
      secret,
      expiresAt: Date.now() + 86400000,
      verified: false,
    };

    this.subscriptions.set(feed.url, subscription);

    const hubUrl = this.getHubUrl(feed.url);
    if (!hubUrl) return false;

    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.topic': feed.url,
      'hub.callback': callbackUrl,
      'hub.secret': subscription.secret,
      'hub.verify': 'async',
    });

    try {
      const res = await fetch(hubUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (res.ok) {
        this.logger.info('Subscribed to feed', { feedId: feed.id, hub: hubUrl });
        return true;
      } else {
        this.logger.warn('Failed to subscribe to feed', { feedId: feed.id, status: res.status });
        return false;
      }
    } catch (err) {
      this.logger.error('Error subscribing to feed', { feedId: feed.id, error: (err as Error).message });
      return false;
    }
  }

  private getTopicForFeed(feed: Feed): string | null {
    if (feed.feedType === 'youtube') {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${feed.url}`;
    }
    if (feed.feedType === 'twitch') {
      return `https://api.twitch.tv/helix/streams?user_login=${feed.url}`;
    }
    return feed.url;
  }

  private getHubUrl(feedUrl: string): string | null {
    // Would need to discover hub from feed link headers
    // For now, return known hubs
    if (feedUrl.includes('youtube.com')) {
      return 'https://pubsubhubbub.appspot.com';
    }
    return null;
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }

  async subscribeToAllFeeds(): Promise<void> {
    const feeds = this.deps.repo.listFeedsForAllUsers();
    for (const feed of feeds) {
      if (feed.enabled) {
        await this.subscribeToFeed(feed);
      }
    }
  }
}
