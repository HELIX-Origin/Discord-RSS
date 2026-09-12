import type { AppDeps } from '../../app.js';
import { readBodyJson, sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { canUserManageGuild, requireDashboardUser } from './shared.js';

export function registerDiscordRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/discord/channels', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;

    const botInviteUrl = d.config.clientId
      ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(d.config.clientId)}&scope=bot%20applications.commands&permissions=586263558272`
      : null;

    if (!d.bot) {
      sendJson(res, 200, {
        botEnabled: false,
        botInviteUrl,
        guilds: [],
      });
      return;
    }

    try {
      const allGuilds = await d.bot.getGuildsWithChannels();
      const guilds = allGuilds.filter((g) => canUserManageGuild(userId, g.id, d));
      sendJson(res, 200, {
        botEnabled: true,
        botInviteUrl,
        guilds,
      });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Failed to fetch Discord channels');
    }
  });

  // Per-guild forum/thread delivery configuration (visible to guild managers, not just the host).
  router.add('GET', '/api/discord/thread-config', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;

    if (!d.bot) {
      sendJson(res, 200, { botEnabled: false, guilds: [] });
      return;
    }

    try {
      const allGuilds = await d.bot.getGuildsWithChannels();
      const managed = allGuilds.filter((g) => canUserManageGuild(userId, g.id, d));
      const guilds = await Promise.all(
        managed.map(async (g) => {
          const allChannels = await d.bot!.getGuildChannelsAll(g.id).catch(() => []);
          const forumChannels = allChannels.filter((ch) => ch.type === 15).map((ch) => ({ id: ch.id, name: ch.name }));
          const binding = d.repo.getGuildBinding(g.id);
          return {
            guildId: g.id,
            name: g.name,
            icon: g.icon,
            threadsEnabled: binding?.threadsEnabled === 1,
            forumChannelIds: binding?.forumChannelIds ?? [],
            forumChannels,
          };
        }),
      );
      sendJson(res, 200, { botEnabled: true, guilds });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Failed to fetch thread configuration');
    }
  });

  router.add('PUT', '/api/discord/thread-config', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    if (!d.bot) return sendError(res, 400, 'Discord bot is not enabled');

    const body = (await readBodyJson(req)) as {
      guildId?: string;
      threadsEnabled?: boolean;
      forumChannelIds?: string[];
    };
    const guildId = body.guildId?.trim();
    if (!guildId) return sendError(res, 400, 'guildId is required');

    const allGuilds = await d.bot.getGuildsWithChannels().catch(() => []);
    const targetGuild = allGuilds.find((g) => g.id === guildId);
    if (!targetGuild) return sendError(res, 404, 'Guild not found');
    if (!canUserManageGuild(userId, guildId, d)) {
      return sendError(res, 403, 'Forbidden: You cannot configure threads for this server.');
    }

    const forumChannelIds = Array.isArray(body.forumChannelIds)
      ? body.forumChannelIds.map((id) => String(id).trim())
      : [];
    const validForumIds = new Set(
      (await d.bot.getGuildChannelsAll(guildId)).filter((ch) => ch.type === 15).map((ch) => ch.id),
    );
    const invalid = forumChannelIds.filter((id) => !validForumIds.has(id));
    if (invalid.length > 0) {
      return sendError(res, 400, `Invalid forum channel ids for this server: ${invalid.join(', ')}`);
    }

    const threadsEnabled = Boolean(body.threadsEnabled) && forumChannelIds.length > 0;
    const updated = d.repo.setGuildThreadConfig(guildId, { threadsEnabled, forumChannelIds });
    d.repo.logActivity(
      userId,
      'info',
      'threads',
      threadsEnabled
        ? `Enabled forum thread delivery for server "${targetGuild.name}" (${forumChannelIds.length} forum channel${forumChannelIds.length === 1 ? '' : 's'}).`
        : `Disabled forum thread delivery for server "${targetGuild.name}".`,
    );
    sendJson(res, 200, {
      guildId,
      threadsEnabled: updated.threadsEnabled === 1,
      forumChannelIds: updated.forumChannelIds,
    });
  });
}
