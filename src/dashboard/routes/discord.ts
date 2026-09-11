import type { AppDeps } from '../../app.js';
import { sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { canUserManageGuild, requireDashboardUser } from './shared.js';

export function registerDiscordRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/discord/channels', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;

    const botInviteUrl = d.config.clientId
      ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(d.config.clientId)}&scope=bot%20applications.commands&permissions=534723950656`
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
}
