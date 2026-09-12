import type { AppDeps } from '../../app.js';
import { readBodyJson, sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { canUserManageGuild, requireDashboardUser } from './shared.js';
import type { FeedCategory } from '../../state/types.js';

const VALID_CATEGORIES: FeedCategory[] = ['rss', 'reddit', 'freegames'];

export function registerGuildRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/guilds', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;

    if (!d.bot) {
      sendJson(res, 200, { botEnabled: false, guilds: [] });
      return;
    }

    try {
      const allGuilds = await d.bot.getGuildsWithChannels();
      const guilds = allGuilds
        .filter((g) => canUserManageGuild(userId, g.id, d))
        .map((g) => ({ id: g.id, name: g.name, icon: g.icon }));
      sendJson(res, 200, { botEnabled: true, guilds });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Failed to fetch guilds');
    }
  });

  router.add('GET', '/api/guilds/:guildId/categories', async (req, res, ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;

    const guildId = ctx.params['guildId'];
    if (!guildId) return sendError(res, 400, 'guildId is required');
    if (!d.bot) return sendError(res, 400, 'Discord bot is not enabled');
    if (!canUserManageGuild(userId, guildId, d)) {
      return sendError(res, 403, 'Forbidden: You cannot manage this server.');
    }

    try {
      const allGuilds = await d.bot.getGuildsWithChannels();
      const guild = allGuilds.find((g) => g.id === guildId);
      if (!guild) return sendError(res, 404, 'Guild not found');

      const allChannels = await d.bot.getGuildChannelsAll(guildId).catch(() => []);
      const textChannels = allChannels
        .filter((ch) => ch.type === 0 || ch.type === 5)
        .map((ch) => ({ id: ch.id, name: ch.name, type: ch.type }));
      const forumChannels = allChannels
        .filter((ch) => ch.type === 15)
        .map((ch) => ({ id: ch.id, name: ch.name, type: ch.type }));

      const targets = d.repo.getGuildCategoryTargets(guildId);
      const categories = VALID_CATEGORIES.map((category) => {
        const target = targets.find((t) => t.category === category);
        return {
          category,
          channelId: target?.channelId ?? null,
          threadChannelId: target?.threadChannelId ?? null,
        };
      });

      sendJson(res, 200, {
        guildId,
        name: guild.name,
        icon: guild.icon,
        categories,
        textChannels,
        forumChannels,
      });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Failed to fetch guild categories');
    }
  });

  router.add('PUT', '/api/guilds/:guildId/categories/:category', async (req, res, ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;

    const guildId = ctx.params['guildId'];
    const category = ctx.params['category'];
    if (!guildId) return sendError(res, 400, 'guildId is required');
    if (!VALID_CATEGORIES.includes(category as FeedCategory)) {
      return sendError(res, 400, 'Invalid category. Must be rss, reddit, or freegames.');
    }
    if (!d.bot) return sendError(res, 400, 'Discord bot is not enabled');
    if (!canUserManageGuild(userId, guildId, d)) {
      return sendError(res, 403, 'Forbidden: You cannot manage this server.');
    }

    const body = (await readBodyJson(req)) as {
      channelId?: string | null;
      threadChannelId?: string | null;
    };

    const channelId = body.channelId === undefined ? null : body.channelId ? String(body.channelId).trim() : null;
    const threadChannelId =
      body.threadChannelId === undefined ? null : body.threadChannelId ? String(body.threadChannelId).trim() : null;

    try {
      const allChannels = await d.bot.getGuildChannelsAll(guildId).catch(() => []);
      const validTextIds = new Set(allChannels.filter((ch) => ch.type === 0 || ch.type === 5).map((ch) => ch.id));
      const validForumIds = new Set(allChannels.filter((ch) => ch.type === 15).map((ch) => ch.id));

      if (channelId && !validTextIds.has(channelId)) {
        return sendError(res, 400, `Channel ${channelId} is not a valid text channel in this server.`);
      }
      if (threadChannelId && !validForumIds.has(threadChannelId)) {
        return sendError(res, 400, `Channel ${threadChannelId} is not a valid forum channel in this server.`);
      }

      const updated = d.repo.setGuildCategoryTarget(guildId, category as FeedCategory, channelId, threadChannelId);
      d.repo.logActivity(
        userId,
        'info',
        'guild-categories',
        `Updated ${category} target for guild "${guildId}" (channel=${channelId ?? 'none'}, thread=${threadChannelId ?? 'none'}).`,
      );
      sendJson(res, 200, updated);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Failed to save category target');
    }
  });
}
