import type { Database } from '../database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type Feed } from '../../state/types.js';

/**
 * Feed persistence.
 */
export class FeedRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  listFeeds(userId: number): Feed[] {
    return this.state.listFeeds(userId);
  }

  getFeed(userId: number, id: number): Feed | null {
    return this.state.getFeed(userId, id);
  }

  listFeedsForAllUsers(): Feed[] {
    return this.state.allFeeds();
  }

  addFeed(
    userId: number,
    name: string,
    url: string,
    channelId: string | null,
    feedType: 'rss' | 'scrape' | 'reddit',
    scrape: Feed['scrape'],
    guildId?: string | null,
  ): Feed {
    if (feedType === 'scrape' && !scrape) {
      throw new Error('Scrape feeds require a scrape configuration');
    }

    const result = this.db.raw
      .prepare(
        `INSERT INTO feeds (user_id, name, url, channel_id, guild_id, feed_type, scrape_item, scrape_title, scrape_link, scrape_description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        name,
        url,
        channelId,
        guildId ?? null,
        feedType,
        scrape && feedType === 'scrape' ? scrape.item : null,
        scrape && feedType === 'scrape' ? scrape.title : null,
        scrape && feedType === 'scrape' ? scrape.link : null,
        scrape && feedType === 'scrape' ? (scrape.description ?? null) : null,
        nowIso(),
      );
    const feed: Feed = {
      id: Number(result.lastInsertRowid),
      userId,
      name,
      url,
      channelId,
      guildId: guildId ?? null,
      enabled: 1,
      feedType,
      scrape: scrape && feedType === 'scrape' ? scrape : null,
      lastEntryId: null,
      lastCheckedAt: null,
      createdAt: nowIso(),
    };
    this.state.putFeed(feed);
    return feed;
  }

  updateFeed(
    userId: number,
    id: number,
    fields: {
      name?: string;
      url?: string;
      channelId?: string | null;
      guildId?: string | null;
      enabled?: number;
    },
  ): Feed | null {
    const current = this.state.getFeed(userId, id);
    if (!current) return null;
    const updated: Feed = {
      ...current,
      name: fields.name ?? current.name,
      url: fields.url ?? current.url,
      channelId: fields.channelId !== undefined ? fields.channelId : current.channelId,
      guildId: fields.guildId !== undefined ? fields.guildId : current.guildId,
      enabled: fields.enabled ?? current.enabled,
    };
    this.db.raw
      .prepare(
        'UPDATE feeds SET name = ?, url = ?, channel_id = ?, guild_id = ?, enabled = ? WHERE id = ? AND user_id = ?',
      )
      .run(updated.name, updated.url, updated.channelId ?? null, updated.guildId ?? null, updated.enabled, id, userId);
    this.state.putFeed(updated);
    return updated;
  }

  setFeedChecked(userId: number, id: number, lastEntryId: string | null): void {
    const current = this.state.getFeed(userId, id);
    if (!current) return;
    const updated: Feed = { ...current, lastEntryId, lastCheckedAt: nowIso() };
    this.db.raw
      .prepare('UPDATE feeds SET last_checked_at = ?, last_entry_id = ? WHERE id = ? AND user_id = ?')
      .run(updated.lastCheckedAt, lastEntryId, id, userId);
    this.state.putFeed(updated);
  }

  deleteFeed(userId: number, id: number): void {
    this.db.raw.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').run(id, userId);
    this.state.deleteFeed(id);
  }

  isEntrySent(feedId: number, entryId: string): boolean {
    return this.state.isEntrySent(feedId, entryId);
  }

  markEntrySent(feedId: number, entryId: string): void {
    this.db.raw
      .prepare('INSERT OR IGNORE INTO sent_entries (feed_id, entry_id, sent_at) VALUES (?, ?, ?)')
      .run(feedId, entryId, nowIso());
    this.state.markEntrySent(feedId, entryId);
  }

  latestFeeds(userId: number, limit: number): Feed[] {
    return this.state
      .listFeeds(userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}
