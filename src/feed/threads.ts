import type { AppConfig } from '../config.js';
import type { Repository } from '../db/repository.js';
import type { DiscordChannelSnapshot } from '../bot/rest.js';
import { feedCategory, type Feed, type FeedCategory } from '../state/types.js';
import { createLogger, type LogLevel } from '../util/logger.js';

export interface ThreadSender {
  sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void>;
  getChannel(channelId: string): Promise<DiscordChannelSnapshot>;
  createForumThread(
    forumChannelId: string,
    payload: {
      name: string;
      message?: { content?: string; embeds?: unknown[] } | null;
      autoArchiveDuration?: number;
    },
  ): Promise<{ id: string; name: string; type: number }>;
  archiveThread(threadId: string): Promise<void>;
  getGuildsWithChannels?(): Promise<
    Array<{
      id: string;
      name: string;
      icon: string | null;
      channels: Array<{ id: string; name: string; type: number; position?: number }>;
    }>
  >;
}

export interface ThreadDeliveryOutcome {
  delivered: boolean;
  mode: 'thread' | 'channel';
  threadId?: string;
  fallbackReason?: string;
}

/** Largest allowed auto-archive window Discord accepts (7 days). */
const MAX_AUTO_ARCHIVE_MINUTES = 10080;

/**
 * Coordinates per-feed forum thread delivery.
 *
 * - One dedicated thread per feed, created as a post inside a forum channel.
 * - Threads are polled periodically and "kept open" with keepalive messages
 *   right before Discord would auto-archive them.
 * - When a feed thread reaches `threadMaxMessages` entries it is archived and
 *   a fresh thread is opened in its place.
 * - Feature is optional: it applies only to guilds with threads enabled
 *   (dashboard config) or when `FORUM_CHANNEL_IDS` points at a forum in the
 *   same guild. Otherwise feeds keep delivering to their regular channel.
 */
export class FeedThreadManager {
  private readonly logger;
  private forumGuildCache: Map<string, string> | null = null;

  constructor(
    private readonly repo: Repository,
    private readonly bot: ThreadSender | null,
    private readonly config: AppConfig,
    logLevel?: LogLevel,
  ) {
    this.logger = createLogger('threads', logLevel);
  }

  /** Forum channel ids available for a guild (dashboard config first, env defaults second). */
  async forumChannelsForGuild(guildId: string | null | undefined): Promise<string[]> {
    if (!guildId) return [];
    const binding = this.repo.getGuildBinding(guildId);
    if (binding) {
      if (binding.threadsEnabled && binding.forumChannelIds.length > 0) {
        return binding.forumChannelIds;
      }
      if (binding.threadsEnabled) {
        return this.envChannelsForGuild(guildId);
      }
    }
    return this.envChannelsForGuild(guildId);
  }

  private async envChannelsForGuild(guildId: string): Promise<string[]> {
    if (this.config.forumChannelIds.length === 0) return [];
    const guildMap = await this.resolveForumGuilds();
    return this.config.forumChannelIds.filter((id) => guildMap.get(id) === guildId);
  }

  private async resolveForumGuilds(): Promise<Map<string, string>> {
    if (this.forumGuildCache) return this.forumGuildCache;
    const guildMap = new Map<string, string>();
    if (this.bot) {
      await Promise.all(
        this.config.forumChannelIds.map(async (id) => {
          try {
            const channel = await this.bot!.getChannel(id);
            if (channel.guild_id) guildMap.set(id, channel.guild_id);
          } catch {
            // Unknown/unreachable forum channel; skip
          }
        }),
      );
    }
    this.forumGuildCache = guildMap;
    return guildMap;
  }

  /** Resolves the guild a feed belongs to (persisted guildId or the guild of its channel). */
  private async resolveFeedGuild(feed: Feed): Promise<string | null> {
    if (feed.guildId) return feed.guildId;
    if (!this.bot || !this.bot.getGuildsWithChannels) return null;
    try {
      const guilds = await this.bot.getGuildsWithChannels().catch(() => null);
      if (!guilds) return null;
      for (const guild of guilds) {
        if (guild.channels.some((c) => c.id === feed.channelId)) return guild.id;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /** Picks a forum channel for a feed, stable across deliveries. */
  async forumChannelForFeed(feed: Feed): Promise<string | null> {
    const guildId = await this.resolveFeedGuild(feed);
    if (!guildId) return null;

    const category = feedCategory(feed.feedType) as FeedCategory | null;
    if (category) {
      const target = this.repo.getGuildCategoryTarget(guildId, category);
      if (target?.threadChannelId) return target.threadChannelId;
    }

    const channels = await this.forumChannelsForGuild(guildId);
    if (channels.length === 0) return null;
    return channels[Math.abs(feed.id) % channels.length];
  }

  /**
   * Delivers an entry into the feed's dedicated forum thread, or falls back to
   * the feed's regular channel when thread delivery is not configured.
   */
  async deliver(feed: Feed, payload: { content?: string; embeds?: unknown[] }): Promise<ThreadDeliveryOutcome> {
    const forumChannelId = await this.forumChannelForFeed(feed);
    if (!forumChannelId) {
      if (feed.threadChannelId) {
        // Guild no longer has thread delivery configured; release the stale binding.
        this.repo.setFeedThread(feed.userId, feed.id, null, 0);
      }
      if (!this.bot) {
        this.logger.warn('Discord bot is offline; skipping thread delivery', {
          feedId: feed.id,
          feedName: feed.name,
        });
        return { delivered: false, mode: 'channel', fallbackReason: 'bot offline' };
      }
      return { delivered: false, mode: 'channel', fallbackReason: 'threads not configured for guild' };
    }

    if (!this.bot) {
      this.logger.warn('Discord bot is offline; skipping thread delivery', {
        feedId: feed.id,
        feedName: feed.name,
      });
      return { delivered: false, mode: 'thread', fallbackReason: 'bot offline' };
    }

    try {
      const currentThreadId = feed.threadChannelId;
      if (!currentThreadId) {
        const threadId = await this.createThread(feed, forumChannelId, payload);
        return { delivered: true, mode: 'thread', threadId };
      }

      // Check whether the tracked thread is still open before posting.
      const snapshot = await this.bot.getChannel(currentThreadId);
      const archived = snapshot.thread_metadata?.archived ?? false;

      if (archived || snapshot.type !== 11) {
        this.logger.info('Feed thread no longer active; opening a replacement', {
          feedId: feed.id,
          feedName: feed.name,
          threadId: currentThreadId,
        });
        const threadId = await this.createThread(feed, forumChannelId, payload);
        return { delivered: true, mode: 'thread', threadId, fallbackReason: 'previous thread archived' };
      }

      await this.bot.sendChannelMessage(currentThreadId, payload);

      const entryCount = feed.threadEntryCount + 1;
      if (entryCount >= this.config.threadMaxMessages) {
        await this.rotate(feed, currentThreadId, forumChannelId, entryCount);
        return {
          delivered: true,
          mode: 'thread',
          threadId: feed.threadChannelId ?? currentThreadId,
          fallbackReason: 'rotated',
        };
      }
      this.repo.setFeedThread(feed.userId, feed.id, currentThreadId, entryCount);
      return { delivered: true, mode: 'thread', threadId: currentThreadId };
    } catch (err) {
      this.logger.warn('Thread delivery failed for feed entry', {
        feedId: feed.id,
        feedName: feed.name,
        error: err instanceof Error ? err.message : String(err),
      });
      return { delivered: false, mode: 'thread', fallbackReason: err instanceof Error ? err.message : String(err) };
    }
  }

  private async createThread(
    feed: Feed,
    forumChannelId: string,
    payload: { content?: string; embeds?: unknown[] },
  ): Promise<string> {
    const name = feed.name.trim().slice(0, 100) || 'Feed updates';
    try {
      const thread = await this.bot!.createForumThread(forumChannelId, {
        name,
        message: payload,
        autoArchiveDuration: MAX_AUTO_ARCHIVE_MINUTES,
      });
      this.repo.setFeedThread(feed.userId, feed.id, thread.id, 1);
      this.repo.logActivity(feed.userId, 'info', 'threads', `Opened forum thread "${name}" for feed "${feed.name}".`);
      return thread.id;
    } catch (err) {
      this.logger.warn('Forum thread creation failed; retrying without archive override', {
        feedId: feed.id,
        error: err instanceof Error ? err.message : String(err),
      });
      const thread = await this.bot!.createForumThread(forumChannelId, {
        name,
        message: payload,
      });
      this.repo.setFeedThread(feed.userId, feed.id, thread.id, 1);
      this.repo.logActivity(feed.userId, 'info', 'threads', `Opened forum thread "${name}" for feed "${feed.name}".`);
      return thread.id;
    }
  }

  private async rotate(feed: Feed, oldThreadId: string, forumChannelId: string, entryCount: number): Promise<void> {
    try {
      await this.bot!.archiveThread(oldThreadId);
      this.logger.info('Archived large feed thread; opening a replacement', {
        feedId: feed.id,
        feedName: feed.name,
        entries: entryCount,
      });
      this.repo.logActivity(
        feed.userId,
        'info',
        'threads',
        `Feed "${feed.name}" reached ${entryCount} posts — archived thread and opened a new one.`,
      );
    } catch (err) {
      this.logger.warn('Failed to archive feed thread during rotation', {
        feedId: feed.id,
        threadId: oldThreadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const intro = {
      content: `🗂️ **New thread started.** Previous thread for **${feed.name}** was archived after ${entryCount} posts.`,
    };
    try {
      const thread = await this.bot!.createForumThread(forumChannelId, {
        name: (feed.name.trim() || 'Feed updates').slice(0, 100),
        message: intro,
        autoArchiveDuration: MAX_AUTO_ARCHIVE_MINUTES,
      });
      this.repo.setFeedThread(feed.userId, feed.id, thread.id, 0);
    } catch (err) {
      this.logger.warn('Failed to open replacement thread during rotation', {
        feedId: feed.id,
        error: err instanceof Error ? err.message : String(err),
      });
      this.repo.setFeedThread(feed.userId, feed.id, null, 0);
    }
  }

  /** Keepalive pass — keeps actively tracked feed threads from auto-archiving. */
  async keepAliveAll(): Promise<void> {
    if (!this.bot || !this.config.threadKeepaliveEnabled) return;
    const feeds = this.repo.listFeedsForAllUsers().filter((f) => f.threadChannelId);
    await Promise.all(
      feeds.map(async (feed) => {
        try {
          const threadId = feed.threadChannelId!;
          const snapshot = await this.bot!.getChannel(threadId);
          if (!snapshot.thread_metadata || snapshot.thread_metadata.archived) {
            this.repo.setFeedThread(feed.userId, feed.id, null, 0);
            return;
          }
          const archiveTs = snapshot.thread_metadata.archive_timestamp;
          if (!archiveTs) return;
          const archiveTime = new Date(archiveTs).getTime();
          const now = Date.now();
          if (Number.isNaN(archiveTime) || archiveTime - now > this.config.threadKeepaliveGraceMs) return;

          await this.bot!.sendChannelMessage(threadId, {
            content: '📡 Thread keep-alive — prevents auto-archive.',
          });
          this.logger.debug('Posted keep-alive to feed thread', { feedId: feed.id, threadId });
        } catch (err) {
          this.logger.debug('Could not run keep-alive for feed thread', {
            feedId: feed.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }
}
