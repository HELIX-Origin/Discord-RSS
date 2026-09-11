import type { AppDeps } from '../../app.js';
import { readBodyJson, sendError, sendJson } from '../../http/helpers.js';
import type { Router } from '../../http/router.js';
import { isValidHttpUrl, requireUser } from './shared.js';

export function registerWebhooksRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/webhooks', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, d.repo.listWebhooks(userId));
  });

  router.add('POST', '/api/webhooks', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { name?: string; url?: string };
    const name = body.name?.trim();
    const url = body.url?.trim();
    if (!name || !url) return sendError(res, 400, 'name and url are required');
    if (!isValidHttpUrl(url)) return sendError(res, 400, 'Invalid URL');
    try {
      const webhook = d.repo.addWebhook(userId, name, url);
      d.repo.logActivity(userId, 'info', 'webhooks', `Added webhook "${webhook.name}"`);
      sendJson(res, 201, webhook);
    } catch (err) {
      sendError(res, 409, err instanceof Error ? err.message : 'Failed to add webhook');
    }
  });

  router.add('PATCH', '/api/webhooks/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const id = Number(ctx.params['id']);
    const body = (await readBodyJson(req)) as { name?: string; url?: string; enabled?: boolean };
    const webhook = d.repo.updateWebhook(userId, id, {
      name: body.name?.trim(),
      url: body.url?.trim(),
      enabled: body.enabled === undefined ? undefined : body.enabled ? 1 : 0,
    });
    if (!webhook) return sendError(res, 404, 'Webhook not found');
    sendJson(res, 200, webhook);
  });

  router.add('DELETE', '/api/webhooks/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    d.repo.deleteWebhook(userId, Number(ctx.params['id']));
    sendJson(res, 200, { ok: true });
  });

  // ---- Discord Bot Channels & Webhook Auto-Provisioning ----
  router.add('GET', '/api/discord/channels', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
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
      const guilds = await d.bot.getGuildsWithChannels();
      sendJson(res, 200, {
        botEnabled: true,
        botInviteUrl,
        guilds,
      });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Failed to fetch Discord channels');
    }
  });

  router.add('POST', '/api/discord/channels/:id/webhook', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;

    if (!d.bot) {
      sendError(res, 400, 'Discord bot is not running. Please configure DISCORD_TOKEN in environment.');
      return;
    }

    const channelId = ctx.params['id'];
    const body = (await readBodyJson(req)) as { name?: string };
    const webhookName = body.name?.trim() || 'HELIX RSS';

    try {
      const wh = await d.bot.createChannelWebhook(channelId, webhookName);
      const webhook = d.repo.addWebhook(userId, wh.name, wh.url);
      d.repo.logActivity(
        userId,
        'info',
        'webhooks',
        `Auto-provisioned Discord webhook "${webhook.name}" in channel #${channelId}`,
      );
      sendJson(res, 201, webhook);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : 'Failed to auto-create Discord webhook');
    }
  });
}
