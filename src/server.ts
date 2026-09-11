import { existsSync, readFileSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import https from 'node:https';
import type { AppDeps } from './app.js';
import { getRequestBaseUrl, sendError, sendHtml, sendText } from './http/helpers.js';
import { Router } from './http/router.js';
import { renderDashboardHtml } from './http/dashboard.js';
import { registerDevToolsRoutes } from './http/dev-tools.js';
import { renderLoginHtml } from './http/login.js';
import { registerAuthRoutes } from './lib/routes/auth.js';
import { registerOAuthRoutes } from './lib/routes/oauth.js';
import { registerFeedsRoutes } from './lib/routes/feeds.js';
import { registerBuilderRoutes } from './lib/routes/builder.js';
import { registerDiscordRoutes } from './lib/routes/discord.js';
import { registerMonitorsRoutes } from './lib/routes/monitors.js';
import { registerSettingsRoutes } from './lib/routes/settings.js';
import { registerStatsRoutes } from './lib/routes/stats.js';
import { authedUserId } from './lib/routes/shared.js';
import { createLogger } from './util/logger.js';

export function loadTlsCredentials(
  keyConfig: string | null,
  certConfig: string | null,
): { key: string; cert: string } | null {
  if (!keyConfig || !certConfig) return null;
  try {
    const key = existsSync(keyConfig) ? readFileSync(keyConfig, 'utf8') : keyConfig;
    const cert = existsSync(certConfig) ? readFileSync(certConfig, 'utf8') : certConfig;
    return { key, cert };
  } catch {
    return null;
  }
}

export function createHelixRssServer(deps: AppDeps): Server {
  const router = new Router<AppDeps>();
  const logger = createLogger('http', deps.config.logLevel);
  registerDevToolsRoutes(router);

  router.add('GET', '/login', (_req, res, _ctx, d) => {
    sendHtml(res, 200, renderLoginHtml(false, d.config.redirectUrl));
  });
  router.add('GET', '/register', (_req, res, _ctx, d) => {
    sendHtml(res, 200, renderLoginHtml(true, d.config.redirectUrl));
  });
  router.add('GET', '/', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    sendHtml(res, 200, renderDashboardHtml(d, userId));
  });
  router.add('GET', '/dev-tools', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const { isAdminOrOwner } = await import('./lib/routes/shared.js');
    if (!isAdminOrOwner(userId, d)) {
      sendError(res, 403, 'Forbidden: Administrator or Owner access required');
      return;
    }
    res.writeHead(302, { Location: '/?tab=dev-tools' });
    res.end();
  });
  router.add('GET', '/dev', async (_req, res) => {
    res.writeHead(302, { Location: '/dev-tools' });
    res.end();
  });
  router.add('GET', '/settings', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
    const { isAdminOrOwner } = await import('./lib/routes/shared.js');
    if (!isAdminOrOwner(userId, d)) {
      sendError(res, 403, 'Forbidden: Administrator or Owner access required');
      return;
    }
    res.writeHead(302, { Location: '/?tab=settings' });
    res.end();
  });
  router.add('GET', '/health', (_req, res, _ctx) => {
    sendText(res, 200, 'ok');
  });

  // ---- API route groups ----
  registerAuthRoutes(router, deps);
  registerOAuthRoutes(router);
  registerFeedsRoutes(router);
  registerBuilderRoutes(router);
  registerDiscordRoutes(router);
  registerMonitorsRoutes(router);
  registerSettingsRoutes(router);
  registerStatsRoutes(router);

  const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
    const baseUrl = getRequestBaseUrl(req, deps.config.publicBaseUrl, `${deps.config.host}:${deps.config.port}`);
    const url = new URL(req.url ?? '/', baseUrl);
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
  };

  const tlsCredentials = loadTlsCredentials(deps.config.sslKey, deps.config.sslCert);
  const server = tlsCredentials
    ? (https.createServer(tlsCredentials, requestHandler) as unknown as Server)
    : createHttpServer(requestHandler);

  return server;
}

export const createDiscordRssServer = createHelixRssServer;
