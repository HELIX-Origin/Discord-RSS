import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppDeps } from '../../app.js';
import { renderOAuthCallbackHtml, renderOAuthErrorHtml } from '../views/oauth-callback.js';
import { sendError, sendHtml, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { redirectUriForProvider, requireUser } from './shared.js';

export function registerOAuthRoutes(router: Router<AppDeps>): void {
  const handleOAuthError = (
    _req: IncomingMessage,
    res: ServerResponse,
    ctx: { params: Record<string, string>; query: URLSearchParams },
    d: AppDeps,
  ) => {
    const errorParam = ctx.query.get('error') || ctx.query.get('message');
    const desc = ctx.query.get('error_description') || errorParam;
    const provider = ctx.query.get('provider');
    const title = provider ? `${provider} Authentication Notice` : 'OAuth Notice';
    const message = desc
      ? `Authentication could not be completed: ${desc}. The rest of the dashboard is up and running smoothly, so feel free to return there safely.`
      : 'The requested OAuth provider is unavailable or encountered an error. The rest of the dashboard is up and running smoothly, so feel free to return there safely.';
    const appName = d.bot?.getAppName() || 'HELIX RSS';
    const appIconUrl = d.bot?.getAppIconUrl() || null;
    sendHtml(res, 200, renderOAuthErrorHtml(title, message, appName, appIconUrl));
  };

  router.add('GET', '/oauth/error', handleOAuthError);
  router.add('GET', '/api/oauth/error', handleOAuthError);

  router.add('GET', '/api/oauth/:provider/connect', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    try {
      const redirectUri = redirectUriForProvider(d, ctx.params['provider'], req);
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
    const appName = d.bot?.getAppName() || 'HELIX RSS';
    const appIconUrl = d.bot?.getAppIconUrl() || null;
    try {
      const redirectUri = redirectUriForProvider(d, provider, req);
      await d.oauth.handleCallback(state, code, redirectUri);
      d.repo.logActivity(null, 'info', 'oauth', `OAuth provider "${provider}" connected`);
      sendHtml(res, 200, renderOAuthCallbackHtml('success', provider, undefined, appName, appIconUrl));
    } catch (err) {
      sendHtml(
        res,
        400,
        renderOAuthCallbackHtml(
          'error',
          provider,
          err instanceof Error ? err.message : 'OAuth callback failed',
          appName,
          appIconUrl,
        ),
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
