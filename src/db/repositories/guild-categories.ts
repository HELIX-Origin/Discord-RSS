import type { Database } from '../database.js';
import { AppState } from '../../state/app-state.js';
import { nowIso, type FeedCategory, type GuildCategory } from '../../state/types.js';

/**
 * Per-guild category target persistence (rss / reddit / freegames).
 */
export class GuildCategoryRepository {
  constructor(
    protected readonly db: Database,
    protected readonly state: AppState,
  ) {}

  getCategoryTarget(guildId: string, category: FeedCategory): GuildCategory | null {
    return this.state.getGuildCategory(guildId, category);
  }

  getCategoryTargets(guildId: string): GuildCategory[] {
    return this.state.listGuildCategories(guildId);
  }

  setCategoryTarget(
    guildId: string,
    category: FeedCategory,
    channelId: string | null,
    threadChannelId: string | null,
  ): GuildCategory {
    const updatedAt = nowIso();
    this.db.raw
      .prepare(
        `INSERT INTO guild_categories (guild_id, category, channel_id, thread_channel_id, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(guild_id, category) DO UPDATE SET
           channel_id = excluded.channel_id,
           thread_channel_id = excluded.thread_channel_id,
           updated_at = excluded.updated_at`,
      )
      .run(guildId, category, channelId, threadChannelId, updatedAt);

    const guildCategory: GuildCategory = {
      guildId,
      category,
      channelId,
      threadChannelId,
      updatedAt,
    };
    this.state.putGuildCategory(guildCategory);
    return guildCategory;
  }
}
