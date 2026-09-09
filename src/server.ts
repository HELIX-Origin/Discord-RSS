import { createServer } from 'node:http';
import type { AppDeps } from './app.js';
import { sendError, sendHtml, sendText } from './http/helpers.js';
import { Router } from './http/router.js';
import { renderDashboardHtml } from './http/dashboard.js';
import { registerDevToolsRoutes } from './http/dev-tools.js';
import { renderLoginHtml } from './http/login.js';
import { registerAuthRoutes } from './http/routes/auth.js';
import { registerOAuthRoutes } from './http/routes/oauth.js';
import { registerFeedsRoutes } from './http/routes/feeds.js';
import { registerBuilderRoutes } from './http/routes/builder.js';
import { registerWebhooksRoutes } from './http/routes/webhooks.js';
import { registerMonitorsRoutes } from './http/routes/monitors.js';
import { registerSettingsRoutes } from './http/routes/settings.js';
import { registerStatsRoutes } from './http/routes/stats.js';
import { authedUserId } from './http/routes/shared.js';
import { createLogger } from './util/logger.js';

export function createDiscordRssServer(deps: AppDeps) {
  const router = new Router<AppDeps>();
  const logger = createLogger('http', deps.config.logLevel);
  registerDevToolsRoutes(router);

  // ---- Pages ----
  router.add('GET', '/login', (_req, res) => {
    sendHtml(res, 200, renderLoginHtml(false));
  });
  router.add('GET', '/register', (_req, res) => {
    sendHtml(res, 200, renderLoginHtml(true));
  });
  router.add('GET', '/', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      sendHtml(res, 200, renderLoginHtml(false));
      return;
    }
    sendHtml(res, 200, renderDashboardHtml(d, userId));
  });
  router.add('GET', '/health', (_req, res, _ctx) => {
    sendText(res, 200, 'ok');
  });

  // ---- API route groups ----
  registerAuthRoutes(router, deps);
  registerOAuthRoutes(router);
  registerFeedsRoutes(router);
  registerBuilderRoutes(router);
  registerWebhooksRoutes(router);
  registerMonitorsRoutes(router);
  registerSettingsRoutes(router);
  registerStatsRoutes(router);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const match = router.find(req.method ?? 'GET', url.pathname);
    if (!match) {
      sendError(res, 404, 'Not found');
      return;
    }
    try {
      await match.handler(req, res, { params: match.params, query: url.searchParams }, deps);
    } catch (err) {
      const userId = await authedUserId(req, deps).catch(() => null);
      logger.error(
        'Request handler failed',
        {
          method: req.method,
          path: url.pathname,
          query: url.searchParams.toString(),
          userId,
        },
        err,
      );
      if (!res.headersSent) sendError(res, 500, 'Internal server error');
    }
  });

  return server;
}
