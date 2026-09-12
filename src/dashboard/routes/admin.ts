import type { AppDeps } from '../../app.js';
import { allBotCommands } from '../../bot/commands/index.js';
import { sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { requireOwner } from './shared.js';

export function registerAdminRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/admin/stats', async (req, res, _ctx, deps) => {
    if ((await requireOwner(req, res, deps)) === null) return;
    const baseStats = deps.db.stats();
    const users = deps.repo.listUsers();
    const adminCount = users.filter((u) => u.role === 'admin' || u.role === 'owner').length;
    const mem = process.memoryUsage();

    sendJson(res, 200, {
      ...baseStats,
      userCount: users.length,
      adminCount,
      processUptimeSeconds: Math.floor(process.uptime()),
      memoryRssBytes: mem.rss,
      memoryHeapUsedBytes: mem.heapUsed,
      nodeVersion: process.version,
      platform: process.platform,
    });
  });

  router.add('GET', '/api/admin/bot', async (req, res, _ctx, deps) => {
    if ((await requireOwner(req, res, deps)) === null) return;
    const cfg = deps.config;
    const inviteUrl =
      cfg.redirectUrl ||
      (cfg.clientId
        ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(cfg.clientId)}&permissions=8&integration_type=0&scope=bot+applications.commands`
        : null);

    sendJson(res, 200, {
      enabled: Boolean(cfg.botToken),
      hasToken: Boolean(cfg.botToken),
      clientId: cfg.clientId,
      botHost: cfg.host,
      botPort: cfg.botPort,
      redirectUrl: cfg.redirectUrl,
      callbackUrl: cfg.callbackUrl,
      inviteUrl,
      commands: allBotCommands.map((c) => ({
        name: c.name,
        description: c.description,
        optionsCount: c.options?.length ?? 0,
      })),
      isStarted: Boolean(deps.bot),
    });
  });

  router.add('POST', '/api/admin/bot/sync-commands', async (req, res, _ctx, deps) => {
    const userId = await requireOwner(req, res, deps);
    if (userId === null) return;

    if (!deps.config.clientId) {
      sendError(res, 400, 'DISCORD_CLIENT_ID is not configured in environment');
      return;
    }
    if (!deps.bot) {
      sendError(res, 400, 'Discord Bot is not currently running');
      return;
    }

    try {
      await deps.bot.rest.registerGlobalCommands(deps.config.clientId, allBotCommands);
      deps.repo.logActivity(userId, 'info', 'dev-tools', 'Discord global slash commands re-synced successfully');
      sendJson(res, 200, { ok: true, commandsCount: allBotCommands.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      deps.repo.logActivity(userId, 'error', 'dev-tools', `Failed to sync Discord commands: ${msg}`);
      sendError(res, 500, `Failed to register commands: ${msg}`);
    }
  });

  router.add('POST', '/api/admin/db/optimize', async (req, res, _ctx, deps) => {
    const userId = await requireOwner(req, res, deps);
    if (userId === null) return;

    try {
      deps.db.raw.exec('PRAGMA optimize;');
      deps.repo.logActivity(userId, 'info', 'dev-tools', 'SQLite database optimize completed');
      sendJson(res, 200, { ok: true, stats: deps.db.stats() });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Database optimize failed');
    }
  });

  router.add('GET', '/api/admin/activity', async (req, res, _ctx, deps) => {
    if ((await requireOwner(req, res, deps)) === null) return;
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500);
    const level = url.searchParams.get('level')?.toLowerCase();

    let activity = deps.repo.recentActivity(limit);
    if (level && level !== 'all') {
      activity = activity.filter((a) => a.level.toLowerCase() === level);
    }
    sendJson(res, 200, activity);
  });

  router.add('GET', '/api/admin/config', async (req, res, _ctx, deps) => {
    if ((await requireOwner(req, res, deps)) === null) return;
    const cfg = deps.config;
    sendJson(res, 200, {
      host: cfg.host,
      port: cfg.port,
      dbPath: cfg.dbPath,
      logLevel: cfg.logLevel,
      pollIntervalMs: cfg.pollIntervalMs,
      requestTimeoutMs: cfg.requestTimeoutMs,
      internalUrl: cfg.internalUrl,
      publicBaseUrl: cfg.publicBaseUrl,
      sslConfigured: Boolean(cfg.sslKey && cfg.sslCert),
      botSslConfigured: Boolean(cfg.botSslKey && cfg.botSslCert),
      redisConfigured: true,
      botEnabled: Boolean(cfg.botToken),
      botHost: cfg.host,
      botPort: cfg.botPort,
      clientId: cfg.clientId,
      redirectUrl: cfg.redirectUrl,
      callbackUrl: cfg.callbackUrl,
    });
  });
}
