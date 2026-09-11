import { existsSync, readFileSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import https from 'node:https';
import type { AppDeps } from '../app.js';
import { getRequestBaseUrl, sendError, sendHtml, sendJson, sendText } from './http/helpers.js';
import { Router } from './http/router.js';
import { renderDashboardHtml } from './render/render.js';
import { registerDevToolsRoutes } from './http/dev-tools.js';
import { renderLoginHtml } from './http/login.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerOAuthRoutes } from './routes/oauth.js';
import { registerFeedsRoutes } from './routes/feeds.js';
import { registerBuilderRoutes } from './routes/builder.js';
import { registerDiscordRoutes } from './routes/discord.js';
import { registerMonitorsRoutes } from './routes/monitors.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerStatsRoutes } from './routes/stats.js';
import { authedUserId, isAdminOrOwner } from './routes/shared.js';
import { createLogger } from '../util/logger.js';
import { dispatchInteraction } from '../bot/commands/index.js';
import { DiscordRestClient } from '../bot/rest.js';
import type { DiscordInteraction } from '../bot/types.js';

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

  // Root redirect / status
  router.add('GET', '/', async (req, res) => {
    const acceptHeader = req.headers['accept'] ?? '';
    if (acceptHeader.includes('application/json')) {
      const proto = deps.config.sslKey || deps.config.botSslKey ? 'https' : 'http';
      sendJson(res, 200, { status: 'ok', service: 'helix-rss-bot', proto, uptime: process.uptime() });
      return;
    }
    const baseUrl = getRequestBaseUrl(req, deps.config.publicBaseUrl, `${deps.config.host}:${deps.config.port}`);
    const url = new URL(req.url ?? '/', baseUrl);
    const dest = url.search ? `/dashboard${url.search}` : '/dashboard';
    res.writeHead(302, { Location: dest });
    res.end();
  });

  // Dashboard UI
  router.add('GET', '/dashboard', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    sendHtml(res, 200, renderDashboardHtml(d, userId));
  });

  // Auth pages
  router.add('GET', '/login', (_req, res, _ctx, d) => {
    sendHtml(res, 200, renderLoginHtml(false, d.config.redirectUrl));
  });
  router.add('GET', '/register', (_req, res, _ctx, d) => {
    sendHtml(res, 200, renderLoginHtml(true, d.config.redirectUrl));
  });

  // Bot invite redirects
  const handleInvite = (_req: IncomingMessage, res: ServerResponse, _ctx: unknown, d: AppDeps) => {
    if (d.config.redirectUrl) {
      res.writeHead(302, { Location: d.config.redirectUrl });
      res.end();
      return;
    }
    sendError(res, 404, 'Bot invite URL is not configured');
  };
  router.add('GET', '/invite', handleInvite);
  router.add('GET', '/bot/invite', handleInvite);
  router.add('GET', '/api/bot/invite', handleInvite);

  // Navigation shortcuts
  router.add('GET', '/dev-tools', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return;
    }
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
    if (!isAdminOrOwner(userId, d)) {
      sendError(res, 403, 'Forbidden: Administrator or Owner access required');
      return;
    }
    res.writeHead(302, { Location: '/?tab=settings' });
    res.end();
  });

  // Health endpoint
  router.add('GET', '/health', (req, res) => {
    const accept = req.headers['accept'];
    if (accept === '*/*' || accept?.includes('text/plain')) {
      sendText(res, 200, 'ok');
      return;
    }
    const proto = deps.config.sslKey || deps.config.botSslKey ? 'https' : 'http';
    sendJson(res, 200, { status: 'ok', service: 'helix-rss-bot', proto, uptime: process.uptime() });
  });

  // Discord interactions (webhook)
  const handleInteractions = async (req: IncomingMessage, res: ServerResponse, _ctx: unknown, d: AppDeps) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const interaction = JSON.parse(body) as DiscordInteraction;
        if (interaction.type === 1) {
          sendJson(res, 200, { type: 1 });
          return;
        }
        const rest = d.bot?.rest ?? new DiscordRestClient(d.config.botToken ?? '');
        const response = await dispatchInteraction(interaction, d, rest);
        sendJson(res, 200, response);
      } catch (err) {
        sendError(res, 500, (err as Error).message);
      }
    });
  };
  router.add('POST', '/interactions', handleInteractions);
  router.add('POST', '/', handleInteractions);

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

  const keyConfig = deps.config.sslKey || deps.config.botSslKey;
  const certConfig = deps.config.sslCert || deps.config.botSslCert;
  const tlsCredentials = loadTlsCredentials(keyConfig, certConfig);
  const server = tlsCredentials
    ? (https.createServer(tlsCredentials, requestHandler) as unknown as Server)
    : createHttpServer(requestHandler);

  return server;
}

export const createDiscordRssServer = createHelixRssServer;
