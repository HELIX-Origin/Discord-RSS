import type { AppDeps } from '../../app.js';
import type { Router } from './router.js';
import { sendError, sendJson } from './helpers.js';
import { isAdminOrOwner, isOwnerUser, requireAdminOrOwner } from '../routes/shared.js';
import { allBotCommands } from '../../bot/commands/index.js';

export { isAdminOrOwner, isOwnerUser };

export function registerDevToolsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/admin/stats', async (req, res, _ctx, deps) => {
    if ((await requireAdminOrOwner(req, res, deps)) === null) return;
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
    if ((await requireAdminOrOwner(req, res, deps)) === null) return;
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
    const userId = await requireAdminOrOwner(req, res, deps);
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
    const userId = await requireAdminOrOwner(req, res, deps);
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
    if ((await requireAdminOrOwner(req, res, deps)) === null) return;
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500);
    const level = url.searchParams.get('level')?.toLowerCase();

    let activity = deps.repo.recentActivity(limit);
    if (level && level !== 'all') {
      activity = activity.filter((a) => a.level.toLowerCase() === level);
    }
    sendJson(res, 200, activity);
  });

  router.add('POST', '/api/admin/trigger-feeds', async (req, res, _ctx, deps) => {
    const userId = await requireAdminOrOwner(req, res, deps);
    if (userId === null) return;

    deps.repo.logActivity(userId, 'info', 'dev-tools', 'Manual feed poll triggered');
    deps.feeds
      .pollAllFeeds(true)
      .then(() => deps.repo.logActivity(userId, 'info', 'dev-tools', 'Manual feed poll completed'))
      .catch((err) =>
        deps.repo.logActivity(userId, 'error', 'dev-tools', err instanceof Error ? err.message : String(err)),
      );
    sendJson(res, 202, { ok: true });
  });

  router.add('GET', '/api/admin/config', async (req, res, _ctx, deps) => {
    if ((await requireAdminOrOwner(req, res, deps)) === null) return;
    const cfg = deps.config;
    sendJson(res, 200, {
      host: cfg.host,
      port: cfg.port,
      dbPath: cfg.dbPath,
      logLevel: cfg.logLevel,
      pollIntervalMs: cfg.pollIntervalMs,
      requestTimeoutMs: cfg.requestTimeoutMs,
      publicBaseUrl: cfg.publicBaseUrl,
      sslConfigured: Boolean(cfg.sslKey && cfg.sslCert),
      botSslConfigured: Boolean(cfg.botSslKey && cfg.botSslCert),
      redisConfigured: Boolean(cfg.redisUrl),
      redisUrl: cfg.redisUrl,
      redisPort: cfg.redisPort,
      botEnabled: Boolean(cfg.botToken),
      botHost: cfg.host,
      botPort: cfg.botPort,
      clientId: cfg.clientId,
      redirectUrl: cfg.redirectUrl,
      callbackUrl: cfg.callbackUrl,
    });
  });
}

export function renderDevToolsNavItem(canAccess: boolean): string {
  if (!canAccess) return '';
  return `<button onclick="switchTab('dev-tools')" id="tab-btn-dev-tools" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
    <i class="fa-solid fa-screwdriver-wrench w-5 text-cyan-400"></i> Dev Tools
  </button>`;
}

export function renderDevToolsSection(canAccess: boolean): string {
  if (!canAccess) return '';
  return `
    <section id="tab-dev-tools" class="tab-content hidden space-y-6">
      <!-- Header Banner -->
      <div class="glass rounded-2xl p-6 border border-gray-800">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-screwdriver-wrench text-cyan-400"></i> Developer Tools &amp; Diagnostics
            </h2>
            <p class="text-xs text-gray-400 mt-1">System telemetry, manual orchestration triggers, Discord bot diagnostics, and delivery testing.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800 flex items-center gap-1.5">
              <i class="fa-solid fa-shield-halved text-cyan-400"></i> Admin &amp; Owner Suite
            </span>
            <button onclick="refreshDevTools()" class="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition border border-gray-700 flex items-center gap-1.5">
              <i class="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div class="bg-gray-900/80 rounded-xl p-3.5 border border-gray-800">
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Feeds</div>
            <div id="dt-feed-count" class="text-xl font-bold text-white mt-1">-</div>
          </div>
          <div class="bg-gray-900/80 rounded-xl p-3.5 border border-gray-800">
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Users / Admins</div>
            <div id="dt-users-count" class="text-xl font-bold text-white mt-1">-</div>
          </div>
          <div class="bg-gray-900/80 rounded-xl p-3.5 border border-gray-800">
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">DB Size</div>
            <div id="dt-db-size" class="text-xl font-bold text-emerald-400 mt-1">-</div>
          </div>
          <div class="bg-gray-900/80 rounded-xl p-3.5 border border-gray-800">
            <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Uptime / Mem</div>
            <div id="dt-uptime-mem" class="text-xs font-mono font-bold text-cyan-300 mt-1.5">-</div>
          </div>
        </div>

        <!-- Quick Action Toolbar -->
        <div class="flex flex-wrap gap-2.5 mt-6 pt-6 border-t border-gray-800/80">
          <button onclick="triggerFeedPoll()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20">
            <i class="fa-solid fa-rotate"></i> Poll all feeds now
          </button>
          <button onclick="optimizeDb()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition flex items-center gap-1.5">
            <i class="fa-solid fa-database"></i> Optimize SQLite DB
          </button>
          <button onclick="syncBotCommands()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white transition flex items-center gap-1.5">
            <i class="fa-brands fa-discord"></i> Sync Slash Commands
          </button>
        </div>
      </div>

      <!-- Discord Bot Diagnostics & Invite -->
      <div class="glass rounded-2xl p-6 border border-gray-800 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-brands fa-discord text-[#5865F2]"></i> Discord Bot Diagnostics &amp; Invite
            </h3>
            <p class="text-xs text-gray-400 mt-0.5">Application slash commands, gateway link status, and bot authorization links.</p>
          </div>
          <span id="dt-bot-badge" class="px-2.5 py-1 rounded-full text-[11px] font-mono bg-gray-800 text-gray-400 border border-gray-700">Loading...</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-2">
            <div class="text-xs font-semibold text-gray-300">Invite Bot to Server</div>
            <p class="text-xs text-gray-400">Share this authorization link with server owners to install the bot with required slash command and channel message permissions.</p>
            <div class="flex items-center gap-2 pt-1">
              <a id="dt-bot-invite-btn" href="#" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold transition inline-flex items-center gap-1.5 shrink-0">
                <i class="fa-brands fa-discord"></i> Invite Bot
              </a>
              <button onclick="copyBotInviteUrl()" class="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition border border-gray-700">
                <i class="fa-solid fa-copy mr-1"></i> Copy URL
              </button>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-2">
            <div class="text-xs font-semibold text-gray-300">Registered Slash Commands</div>
            <div id="dt-bot-commands-list" class="flex flex-wrap gap-1.5 pt-1">
              <span class="text-xs text-gray-500">Loading commands...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Runtime Configuration & Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Service Configuration -->
        <div class="glass rounded-2xl p-6 border border-gray-800 space-y-3">
          <h3 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <i class="fa-solid fa-gears text-amber-400"></i> Service Runtime Configuration
          </h3>
          <pre id="dt-config" class="bg-black/50 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto max-h-72 border border-gray-800">Loading...</pre>
        </div>

        <!-- Activity Filter & Log -->
        <div class="glass rounded-2xl p-6 border border-gray-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-cyan-400"></i> Live Activity Stream
            </h3>
            <div class="flex items-center gap-1">
              <button onclick="filterActivity('all')" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300">All</button>
              <button onclick="filterActivity('error')" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 hover:bg-red-900 text-red-300">Errors</button>
              <button onclick="filterActivity('warn')" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-300">Warns</button>
              <button onclick="filterActivity('info')" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300">Info</button>
            </div>
          </div>
          <div class="overflow-x-auto rounded-xl border border-gray-800 max-h-72">
            <table class="w-full text-xs text-left text-gray-300">
              <thead class="bg-gray-900 text-[10px] uppercase text-gray-500 sticky top-0">
                <tr>
                  <th class="px-3 py-2">Time</th>
                  <th class="px-3 py-2">Level</th>
                  <th class="px-3 py-2">Source</th>
                  <th class="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody id="dt-activity" class="divide-y divide-gray-800 bg-black/30 font-mono text-[11px]">
                <tr><td colspan="4" class="px-3 py-3 text-gray-500 text-center">Loading activity...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>`;
}

export function renderDevToolsScript(): string {
  return `
    let currentBotInviteUrl = '';
    let currentActivityFilter = 'all';

    async function loadDevTools() {
      try {
        const [statsRes, activityRes, configRes, botRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/activity?limit=100&level=' + currentActivityFilter),
          fetch('/api/admin/config'),
          fetch('/api/admin/bot')
        ]);
        if (statsRes.ok) {
          const stats = await statsRes.json();
          document.getElementById('dt-feed-count').textContent = stats.feedCount ?? 0;
          document.getElementById('dt-users-count').textContent = (stats.userCount ?? 0) + ' (' + (stats.adminCount ?? 0) + ' admin)';
          document.getElementById('dt-db-size').textContent = Math.round((stats.dbSizeBytes ?? 0) / 1024) + ' KB';
          const mins = Math.floor((stats.processUptimeSeconds ?? 0) / 60);
          const memMb = Math.round((stats.memoryRssBytes ?? 0) / 1024 / 1024);
          document.getElementById('dt-uptime-mem').textContent = mins + 'm · ' + memMb + 'MB';
        }
        if (configRes.ok) {
          const config = await configRes.json();
          document.getElementById('dt-config').textContent = JSON.stringify(config, null, 2);
        }
        if (botRes.ok) {
          const bot = await botRes.json();
          currentBotInviteUrl = bot.inviteUrl || '';
          const botBadge = document.getElementById('dt-bot-badge');
          if (bot.enabled) {
            botBadge.textContent = 'Active (Port ' + bot.botPort + ')';
            botBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-green-950 text-green-300 border border-green-800';
          } else {
            botBadge.textContent = 'Disabled';
            botBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-mono bg-gray-800 text-gray-400 border border-gray-700';
          }
          const inviteBtn = document.getElementById('dt-bot-invite-btn');
          if (bot.inviteUrl) {
            inviteBtn.href = bot.inviteUrl;
            inviteBtn.classList.remove('opacity-50', 'pointer-events-none');
          } else {
            inviteBtn.removeAttribute('href');
            inviteBtn.classList.add('opacity-50', 'pointer-events-none');
          }
          const cmdContainer = document.getElementById('dt-bot-commands-list');
          if (bot.commands && bot.commands.length) {
            cmdContainer.innerHTML = bot.commands.map(c => \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800" title="\${escapeHtml(c.description)}">/\${escapeHtml(c.name)}</span>\`).join('');
          } else {
            cmdContainer.innerHTML = '<span class="text-xs text-gray-500">No commands loaded</span>';
          }
        }
        if (activityRes.ok) {
          const activity = await activityRes.json();
          renderActivityTable(activity);
        }
      } catch (err) {
        console.error('Failed to load dev tools', err);
      }
    }

    function renderActivityTable(activity) {
      const tbody = document.getElementById('dt-activity');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!activity || !activity.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-3 py-3 text-gray-500 text-center">No activity recorded yet.</td></tr>';
        return;
      }
      for (const row of activity) {
        const tr = document.createElement('tr');
        const levelColor = { debug: 'text-gray-400', info: 'text-cyan-400', warn: 'text-amber-400', error: 'text-red-400' }[row.level] || 'text-gray-400';
        tr.innerHTML = '<td class="px-3 py-1.5 font-mono text-[10px] text-gray-500">' + new Date(row.ts).toLocaleTimeString() + '</td>' +
          '<td class="px-3 py-1.5 ' + levelColor + '">' + row.level + '</td>' +
          '<td class="px-3 py-1.5 text-gray-400">' + escapeHtml(row.source) + '</td>' +
          '<td class="px-3 py-1.5 text-gray-200">' + escapeHtml(row.message) + '</td>';
        tbody.appendChild(tr);
      }
    }

    async function filterActivity(level) {
      currentActivityFilter = level;
      const res = await fetch('/api/admin/activity?limit=100&level=' + level);
      if (res.ok) {
        const activity = await res.json();
        renderActivityTable(activity);
      }
    }

    function copyBotInviteUrl() {
      if (!currentBotInviteUrl) {
        alert('Bot invite URL is not available (DISCORD_CLIENT_ID not configured).');
        return;
      }
      navigator.clipboard.writeText(currentBotInviteUrl).then(() => {
        alert('Discord Bot invite URL copied to clipboard!');
      }).catch(() => {
        prompt('Copy Discord Bot invite URL:', currentBotInviteUrl);
      });
    }

    async function triggerFeedPoll() {
      const res = await fetch('/api/admin/trigger-feeds', { method: 'POST' });
      if (res.ok) alert('Feed poll triggered.');
      refreshDevTools();
    }


    async function optimizeDb() {
      const res = await fetch('/api/admin/db/optimize', { method: 'POST' });
      if (res.ok) {
        alert('SQLite DB optimization completed.');
        refreshDevTools();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to optimize DB');
      }
    }

    async function syncBotCommands() {
      const res = await fetch('/api/admin/bot/sync-commands', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('Successfully synced ' + data.commandsCount + ' Discord slash commands!');
        refreshDevTools();
      } else {
        alert(data.error || 'Failed to sync bot commands');
      }
    }

    function refreshDevTools() {
      loadDevTools();
      if (typeof fetchStats === 'function') fetchStats();
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    const originalSwitchTab = typeof switchTab === 'function' ? switchTab : null;
    if (originalSwitchTab) {
      switchTab = function(name) {
        originalSwitchTab(name);
        if (name === 'dev-tools') loadDevTools();
      };
    }`;
}
