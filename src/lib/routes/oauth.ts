import type { AppDeps } from '../../app.js';
import { renderOAuthCallbackHtml } from '../../http/oauth-callback.js';
import { sendError, sendHtml, sendJson } from '../../http/helpers.js';
import type { Router } from '../../http/router.js';
import { redirectUriForProvider, requireUser } from './shared.js';

export function registerOAuthRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/oauth/:provider/connect', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    try {
      const redirectUri = redirectUriForProvider(d, ctx.params['provider']);
      const authorizeUrl = d.oauth.buildAuthorizeUrl(userId, ctx.params['provider'], redirectUri);
      sendJson(res, 200, { url: authorizeUrl });
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : 'OAuth connect failed');
    }
  });

  router.add('GET', '/api/oauth/:provider/callback', async (req, res, ctx, d) => {
    const state = ctx.query.get('state') ?? '';
    const code = ctx.query.get('code') ?? '';
    const provider = ctx.params['provider'];
    try {
      const redirectUri = redirectUriForProvider(d, provider);
      await d.oauth.handleCallback(state, code, redirectUri);
      d.repo.logActivity(null, 'info', 'oauth', `OAuth provider "${provider}" connected`);
      sendHtml(res, 200, renderOAuthCallbackHtml('success', provider));
    } catch (err) {
      sendHtml(
        res,
        400,
        renderOAuthCallbackHtml('error', provider, err instanceof Error ? err.message : 'OAuth callback failed'),
      );
    }
  });

  router.add('DELETE', '/api/oauth/:provider', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    d.oauth.disconnect(userId, ctx.params['provider']);
    d.repo.logActivity(userId, 'info', 'oauth', `OAuth provider "${ctx.params['provider']}" disconnected`);
    sendJson(res, 200, { ok: true });
  });
}
