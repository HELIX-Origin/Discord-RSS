import type { AppDeps } from '../../app.js';
import { FEED_PRESETS } from '../../feed/presets.js';
import type { FeedType } from '../../state/types.js';
import { readBodyJson, sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { authedUserId, canUserManageGuild, isValidHttpUrl, requireDashboardUser } from './shared.js';

export function registerFeedsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/feeds', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, d.repo.listFeeds(userId));
  });

  router.add('GET', '/api/presets', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    const existing = userId !== null ? new Set(d.repo.listFeeds(userId).map((f) => f.url)) : new Set<string>();
    sendJson(
      res,
      200,
      FEED_PRESETS.map((p) => ({ ...p, alreadyAdded: existing.has(p.url) })),
    );
  });

  router.add('GET', '/api/feeds/interval', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    const userInterval = d.repo.getUserSetting(userId, 'poll_interval_ms');
    const globalInterval = d.repo.getSetting('poll_interval_ms');
    const pollIntervalMs = userInterval ? Number(userInterval) : globalInterval ? Number(globalInterval) : 3_600_000;
    sendJson(res, 200, {
      pollIntervalMs: Number.isInteger(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 3_600_000,
    });
  });

  router.add('POST', '/api/feeds/interval', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { pollIntervalMs?: number };
    const allowed = [60_000, 600_000, 1_800_000, 3_600_000];
    if (body.pollIntervalMs === undefined || !allowed.includes(body.pollIntervalMs)) {
      sendError(
        res,
        400,
        'Invalid poll interval. Allowed intervals are: 1m (60000), 10m (600000), 30m (1800000), 1h (3600000)',
      );
      return;
    }
    d.repo.setUserSetting(userId, 'poll_interval_ms', String(body.pollIntervalMs));
    sendJson(res, 200, { ok: true, pollIntervalMs: body.pollIntervalMs });
  });

  router.add('POST', '/api/feeds', async (req, res, _ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as {
      name?: string;
      url?: string;
      channelId?: string | null;
      feedType?: FeedType;
      scrape?: { item?: string; title?: string; link?: string; description?: string } | null;
    };
    const name = body.name?.trim();
    const url = body.url?.trim();
    if (!name || !url) return sendError(res, 400, 'name and url are required');
    if (!isValidHttpUrl(url) && !url.startsWith('freegames://') && !url.startsWith('https://')) {
      return sendError(res, 400, 'Invalid URL');
    }

    const channelId = body.channelId?.trim() || null;
    let guildId: string | null = null;
    if (channelId && d.bot) {
      const guilds = await d.bot.getGuildsWithChannels();
      const targetGuild = guilds.find((g) => g.channels.some((c) => c.id === channelId));
      if (targetGuild) {
        guildId = targetGuild.id;
        if (!canUserManageGuild(userId, targetGuild.id, d)) {
          sendError(
            res,
            403,
            'Forbidden: You must be a server owner or have Manage Channels permission in this server to add feeds to it.',
          );
          return;
        }
      }
    }

    try {
      const rawType = body.feedType || 'rss';
      const feedType: FeedType =
        rawType === 'scrape'
          ? 'scrape'
          : rawType === 'reddit'
            ? 'reddit'
            : rawType.startsWith('free_games')
              ? (rawType as FeedType)
              : 'rss';
      const scrape =
        body.scrape && body.scrape.item && body.scrape.title && body.scrape.link
          ? {
              item: body.scrape.item.trim(),
              title: body.scrape.title.trim(),
              link: body.scrape.link.trim(),
              description: body.scrape.description?.trim() || undefined,
            }
          : null;
      const feed = d.repo.addFeed(userId, name, url, channelId, feedType, scrape, guildId);
      const typeLabel =
        feedType === 'reddit'
          ? 'Reddit image '
          : feedType === 'scrape'
            ? 'scrape '
            : feedType.startsWith('free_games')
              ? 'Free Games '
              : '';
      d.repo.logActivity(userId, 'info', 'feeds', `Added ${typeLabel}feed "${feed.name}"`);
      sendJson(res, 201, feed);
    } catch (err) {
      sendError(res, 409, err instanceof Error ? err.message : 'Failed to add feed');
    }
  });

  router.add('PATCH', '/api/feeds/:id', async (req, res, ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    const id = Number(ctx.params['id']);
    const body = (await readBodyJson(req)) as {
      name?: string;
      url?: string;
      feedType?: FeedType;
      channelId?: string | null;
      enabled?: boolean;
    };
    let guildId: string | null | undefined = undefined;
    if (body.channelId !== undefined) {
      const newChannelId = body.channelId?.trim() || null;
      if (newChannelId && d.bot) {
        const guilds = await d.bot.getGuildsWithChannels();
        const targetGuild = guilds.find((g) => g.channels.some((c) => c.id === newChannelId));
        if (targetGuild) {
          guildId = targetGuild.id;
          if (!canUserManageGuild(userId, targetGuild.id, d)) {
            sendError(
              res,
              403,
              'Forbidden: You must be a server owner or have Manage Channels permission in this server to route feeds to it.',
            );
            return;
          }
        }
      } else if (newChannelId === null) {
        guildId = null;
      }
    }
    const feed = d.repo.updateFeed(userId, id, {
      name: body.name?.trim(),
      url: body.url?.trim(),
      feedType: body.feedType,
      channelId: body.channelId !== undefined ? body.channelId?.trim() || null : undefined,
      guildId,
      enabled: body.enabled === undefined ? undefined : body.enabled ? 1 : 0,
    });
    if (!feed) return sendError(res, 404, 'Feed not found');
    d.repo.logActivity(userId, 'info', 'feeds', `Updated feed "${feed.name}"`);
    sendJson(res, 200, feed);
  });

  router.add('DELETE', '/api/feeds/:id', async (req, res, ctx, d) => {
    const userId = await requireDashboardUser(req, res, d);
    if (userId === null) return;
    d.repo.deleteFeed(userId, Number(ctx.params['id']));
    sendJson(res, 200, { ok: true });
  });
}
