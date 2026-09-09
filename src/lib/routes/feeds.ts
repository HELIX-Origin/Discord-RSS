import type { AppDeps } from '../../app.js';
import { FEED_PRESETS } from '../../feed/presets.js';
import { readBodyJson, sendError, sendJson } from '../../http/helpers.js';
import type { Router } from '../../http/router.js';
import { isValidHttpUrl, requireUser } from './shared.js';

export function registerFeedsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/feeds', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, d.repo.listFeeds(userId));
  });

  router.add('GET', '/api/presets', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const existing = new Set(d.repo.listFeeds(userId).map((f) => f.url));
    sendJson(
      res,
      200,
      FEED_PRESETS.map((p) => ({ ...p, alreadyAdded: existing.has(p.url) })),
    );
  });

  router.add('POST', '/api/feeds', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as {
      name?: string;
      url?: string;
      webhookId?: number | null;
      feedType?: 'rss' | 'scrape';
      scrape?: { item?: string; title?: string; link?: string; description?: string } | null;
    };
    const name = body.name?.trim();
    const url = body.url?.trim();
    if (!name || !url) return sendError(res, 400, 'name and url are required');
    if (!isValidHttpUrl(url)) return sendError(res, 400, 'Invalid URL');
    if (body.webhookId !== undefined && body.webhookId !== null && !d.repo.getWebhook(userId, body.webhookId)) {
      return sendError(res, 400, 'Webhook not found');
    }
    try {
      const feedType = body.feedType === 'scrape' ? 'scrape' : 'rss';
      const scrape =
        body.scrape && body.scrape.item && body.scrape.title && body.scrape.link
          ? {
              item: body.scrape.item.trim(),
              title: body.scrape.title.trim(),
              link: body.scrape.link.trim(),
              description: body.scrape.description?.trim() || undefined,
            }
          : null;
      const feed = d.repo.addFeed(userId, name, url, body.webhookId ?? null, feedType, scrape);
      d.repo.logActivity(userId, 'info', 'feeds', `Added ${feedType === 'scrape' ? 'scrape ' : ''}feed "${feed.name}"`);
      sendJson(res, 201, feed);
    } catch (err) {
      sendError(res, 409, err instanceof Error ? err.message : 'Failed to add feed');
    }
  });

  router.add('PATCH', '/api/feeds/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const id = Number(ctx.params['id']);
    const body = (await readBodyJson(req)) as {
      name?: string;
      url?: string;
      webhookId?: number | null;
      enabled?: boolean;
    };
    const feed = d.repo.updateFeed(userId, id, {
      name: body.name?.trim(),
      url: body.url?.trim(),
      webhookId: body.webhookId,
      enabled: body.enabled === undefined ? undefined : body.enabled ? 1 : 0,
    });
    if (!feed) return sendError(res, 404, 'Feed not found');
    d.repo.logActivity(userId, 'info', 'feeds', `Updated feed "${feed.name}"`);
    sendJson(res, 200, feed);
  });

  router.add('DELETE', '/api/feeds/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    d.repo.deleteFeed(userId, Number(ctx.params['id']));
    sendJson(res, 200, { ok: true });
  });

  router.add('POST', '/api/feeds/:id/poll', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    await d.feeds.pollFeed(userId, Number(ctx.params['id']));
    sendJson(res, 200, { ok: true });
  });
}
