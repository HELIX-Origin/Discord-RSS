import type { AppDeps } from '../../app.js';
import { readBodyJson, sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { isValidHttpUrl, requireUser } from './shared.js';

export function registerMonitorsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/monitors', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, d.repo.listMonitors(userId));
  });

  router.add('POST', '/api/monitors', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as {
      name?: string;
      url?: string;
      webhookId?: number | null;
      channelId?: string | null;
    };
    const name = body.name?.trim();
    const url = body.url?.trim();
    if (!name || !url) return sendError(res, 400, 'name and url are required');
    if (!isValidHttpUrl(url)) return sendError(res, 400, 'Invalid URL');

    const channelId = body.channelId?.trim() || null;
    const webhookId = body.webhookId ?? null;

    if (webhookId !== null && !d.repo.getWebhook(userId, webhookId)) {
      return sendError(res, 400, 'Webhook not found');
    }

    try {
      const monitor = d.repo.addMonitor(userId, name, url, channelId || webhookId);
      sendJson(res, 201, monitor);
    } catch (err) {
      sendError(res, 409, err instanceof Error ? err.message : 'Failed to add monitor');
    }
  });

  router.add('PATCH', '/api/monitors/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const id = Number(ctx.params['id']);
    const body = (await readBodyJson(req)) as {
      name?: string;
      url?: string;
      channelId?: string | null;
      webhookId?: number | null;
      enabled?: boolean;
    };
    const monitor = d.repo.updateMonitor(userId, id, {
      name: body.name?.trim(),
      url: body.url?.trim(),
      channelId: body.channelId !== undefined ? body.channelId?.trim() || null : undefined,
      webhookId: body.webhookId,
      enabled: body.enabled === undefined ? undefined : body.enabled ? 1 : 0,
    });
    if (!monitor) return sendError(res, 404, 'Monitor not found');
    sendJson(res, 200, monitor);
  });

  router.add('DELETE', '/api/monitors/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    d.repo.deleteMonitor(userId, Number(ctx.params['id']));
    sendJson(res, 200, { ok: true });
  });
}
