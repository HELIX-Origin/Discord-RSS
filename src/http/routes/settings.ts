import type { AppDeps } from '../../app.js';
import { readBodyJson, sendError, sendJson } from '../helpers.js';
import type { Router } from '../router.js';
import { requireUser } from './shared.js';

export function registerSettingsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/settings', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, {
      oauthProviders: d.oauth.listProviders(),
      publicBaseUrl: d.repo.getSetting('public_base_url'),
    });
  });

  router.add('POST', '/api/settings', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { publicBaseUrl?: string };
    if (body.publicBaseUrl !== undefined) {
      d.repo.setSetting('public_base_url', body.publicBaseUrl);
    }
    sendJson(res, 200, { ok: true });
  });

  router.add('POST', '/api/settings/oauth/:provider', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { clientId?: string; clientSecret?: string; enabled?: boolean };
    try {
      d.oauth.saveConfig(ctx.params['provider'], {
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        enabled: body.enabled,
      });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : 'Failed to save OAuth config');
    }
  });
}
