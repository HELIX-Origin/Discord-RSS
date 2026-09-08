import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AppDeps } from './app.js';
import { AuthService } from './auth/service.js';
import {
  clearSessionCookie,
  COOKIE_NAME,
  parseCookies,
  readBodyJson,
  sendError,
  sendHtml,
  sendJson,
  sendText,
  setSessionCookie,
} from './http/helpers.js';
import { Router } from './http/router.js';
import { renderDashboardHtml } from './http/dashboard.js';
import { registerDevToolsRoutes } from './http/dev-tools.js';
import { renderLoginHtml } from './http/login.js';
import { renderOAuthCallbackHtml } from './http/oauth-callback.js';
import { analyzeUrl, analyzeScrapeUrl } from './feed/builder.js';
import type { ScrapeSelectors } from './feed/scraper.js';
import { FEED_PRESETS, presetsGroupedByCategory } from './feed/presets.js';
import { createLogger } from './util/logger.js';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3600;

function getSessionToken(req: IncomingMessage): string {
  return parseCookies(req)[COOKIE_NAME] ?? '';
}

async function authedUserId(req: IncomingMessage, deps: AppDeps): Promise<number | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  const user = deps.repo.getUserBySessionToken(token);
  return user ? user.id : null;
}

async function requireUser(req: IncomingMessage, res: ServerResponse, deps: AppDeps): Promise<number | null> {
  const userId = await authedUserId(req, deps);
  if (userId === null) sendError(res, 401, 'Authentication required');
  return userId;
}

function redirectUriForProvider(deps: AppDeps, provider: string): string {
  const base =
    deps.repo.getSetting('public_base_url') ??
    deps.config.publicBaseUrl ??
    `http://${deps.config.host}:${deps.config.port}`;
  return `${base.replace(/\/+$/, '')}/api/oauth/${encodeURIComponent(provider)}/callback`;
}

export function createDiscordRssServer(deps: AppDeps) {
  const auth = new AuthService(deps.repo);
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

  // ---- Auth API ----
  router.add('POST', '/api/auth/register', async (req, res, _ctx, d) => {
    const body = (await readBodyJson(req)) as { email?: string; password?: string; displayName?: string };
    try {
      const result = auth.register(body.email ?? '', body.password ?? '', body.displayName);
      setSessionCookie(res, result.token, SESSION_MAX_AGE_SECONDS);
      sendJson(res, 201, { user: result.user });
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : 'Registration failed');
    }
  });
  router.add('POST', '/api/auth/login', async (req, res, _ctx, d) => {
    const body = (await readBodyJson(req)) as { email?: string; password?: string };
    try {
      const result = auth.login(body.email ?? '', body.password ?? '');
      setSessionCookie(res, result.token, SESSION_MAX_AGE_SECONDS);
      sendJson(res, 200, { user: result.user });
    } catch (err) {
      sendError(res, 401, err instanceof Error ? err.message : 'Login failed');
    }
  });
  router.add('POST', '/api/auth/logout', (req, res) => {
    const token = getSessionToken(req);
    if (token) auth.logout(token);
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
  });
  router.add('GET', '/api/auth/me', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      sendJson(res, 401, { authenticated: false });
      return;
    }
    const user = d.repo.getUserById(userId)!;
    sendJson(res, 200, {
      authenticated: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      oauthProviders: d.oauth.listProviders(),
      connections: d.oauth.connectionsFor(user.id).map((c) => ({
        provider: c.provider,
        accountId: c.providerAccountId,
        connectedAt: c.createdAt,
      })),
    });
  });

  // ---- OAuth connection flow ----
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

  // ---- Feeds ----
  router.add('GET', '/api/feeds', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, d.repo.listFeeds(userId));
  });
  router.add('GET', '/api/presets', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const existing = new Set(d.repo.listFeeds(userId).map((f) => f.url));
    const groups = presetsGroupedByCategory();
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
    const body = (await readBodyJson(req)) as { name?: string; url?: string; webhookId?: number | null; enabled?: boolean };
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

  // ---- Feed builder ----
  router.add('POST', '/api/builder/analyze', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { url?: string };
    const url = body.url?.trim();
    if (!url) return sendError(res, 400, 'url is required');
    try {
      const analysis = await analyzeUrl(url);
      d.repo.logActivity(userId, 'info', 'builder', `Analyzed ${url}`);
      sendJson(res, 200, analysis);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Analysis failed');
    }
  });

  router.add('POST', '/api/builder/scrape-test', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { url?: string; selectors?: ScrapeSelectors };
    const url = body.url?.trim();
    const sel = body.selectors;
    if (!url || !sel?.itemSelector || !sel.titleSelector || !sel.linkSelector) {
      return sendError(res, 400, 'url, itemSelector, titleSelector, and linkSelector are required');
    }
    try {
      const sample = await analyzeScrapeUrl(url, sel);
      sendJson(res, 200, sample);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Scrape test failed');
    }
  });

  // ---- Webhooks ----
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

  // ---- Status monitors ----
  router.add('GET', '/api/monitors', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    sendJson(res, 200, d.repo.listMonitors(userId));
  });
  router.add('POST', '/api/monitors', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { name?: string; url?: string; webhookId?: number | null };
    const name = body.name?.trim();
    const url = body.url?.trim();
    if (!name || !url) return sendError(res, 400, 'name and url are required');
    try {
      const monitor = d.repo.addMonitor(userId, name, url, body.webhookId ?? null);
      sendJson(res, 201, monitor);
    } catch (err) {
      sendError(res, 409, err instanceof Error ? err.message : 'Failed to add monitor');
    }
  });
  router.add('PATCH', '/api/monitors/:id', async (req, res, ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const id = Number(ctx.params['id']);
    const body = (await readBodyJson(req)) as { name?: string; url?: string; webhookId?: number | null; enabled?: boolean };
    const monitor = d.repo.updateMonitor(userId, id, {
      name: body.name?.trim(),
      url: body.url?.trim(),
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

  // ---- OAuth provider settings ----
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

  // ---- Stats ----
  router.add('GET', '/api/stats', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const dbStats = d.db.stats();
    sendJson(res, 200, {
      ...dbStats,
      myFeeds: d.repo.listFeeds(userId).length,
      myWebhooks: d.repo.listWebhooks(userId).length,
      myMonitors: d.repo.listMonitors(userId).length,
      activity: d.repo.recentActivity(12).map((a) => ({
        ts: a.ts,
        level: a.level,
        source: a.source,
        message: a.message,
      })),
    });
  });

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
      logger.error('Request handler failed', {
        method: req.method,
        path: url.pathname,
        query: url.searchParams.toString(),
        userId,
      }, err);
      if (!res.headersSent) sendError(res, 500, 'Internal server error');
    }
  });

  return server;
}