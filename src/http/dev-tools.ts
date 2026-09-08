import type { AppDeps } from '../app.js';
import type { Router } from './router.js';
import { sendError, sendJson } from './helpers.js';

export function isHostUser(userId: number | null): boolean {
  // Self-hosted services treat the first registered user as the host.
  return userId === 1;
}

export function registerDevToolsRoutes(router: Router<AppDeps>): void {
  async function requireHost(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    deps: AppDeps,
  ): Promise<number | null> {
    const token = (req.headers.cookie ?? '')
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith('drss_session='))
      ?.split('=')[1];
    if (!token) {
      sendError(res, 403, 'Forbidden');
      return null;
    }
    const user = deps.repo.getUserBySessionToken(token);
    if (!user || !isHostUser(user.id)) {
      sendError(res, 403, 'Forbidden');
      return null;
    }
    return user.id;
  }

  router.add('GET', '/api/admin/stats', async (req, res, _ctx, deps) => {
    if ((await requireHost(req, res, deps)) === null) return;
    sendJson(res, 200, deps.db.stats());
  });

  router.add('GET', '/api/admin/activity', async (req, res, _ctx, deps) => {
    if ((await requireHost(req, res, deps)) === null) return;
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
    sendJson(res, 200, deps.repo.recentActivity(limit));
  });

  router.add('POST', '/api/admin/trigger-feeds', async (req, res, _ctx, deps) => {
    if ((await requireHost(req, res, deps)) === null) return;
    deps.repo.logActivity(null, 'info', 'dev-tools', 'Manual feed poll triggered');
    deps.feeds
      .pollAllFeeds()
      .then(() => deps.repo.logActivity(null, 'info', 'dev-tools', 'Manual feed poll completed'))
      .catch((err) =>
        deps.repo.logActivity(null, 'error', 'dev-tools', err instanceof Error ? err.message : String(err)),
      );
    sendJson(res, 202, { ok: true });
  });

  router.add('POST', '/api/admin/trigger-status', async (req, res, _ctx, deps) => {
    if ((await requireHost(req, res, deps)) === null) return;
    deps.repo.logActivity(null, 'info', 'dev-tools', 'Manual status check triggered');
    deps.status
      .checkAllMonitors()
      .then(() => deps.repo.logActivity(null, 'info', 'dev-tools', 'Manual status check completed'))
      .catch((err) =>
        deps.repo.logActivity(null, 'error', 'dev-tools', err instanceof Error ? err.message : String(err)),
      );
    sendJson(res, 202, { ok: true });
  });

  router.add('GET', '/api/admin/config', async (req, res, _ctx, deps) => {
    if ((await requireHost(req, res, deps)) === null) return;
    const cfg = deps.config;
    sendJson(res, 200, {
      host: cfg.host,
      port: cfg.port,
      logLevel: cfg.logLevel,
      pollIntervalMs: cfg.pollIntervalMs,
      statusIntervalMs: cfg.statusIntervalMs,
      requestTimeoutMs: cfg.requestTimeoutMs,
      publicBaseUrl: cfg.publicBaseUrl,
      redisConfigured: !!cfg.redisUrl,
    });
  });
}

export function renderDevToolsNavItem(isHost: boolean): string {
  if (!isHost) return '';
  return `<button onclick="switchTab('dev-tools')" id="tab-btn-dev-tools" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
    <i class="fa-solid fa-screwdriver-wrench w-5"></i> Dev Tools
  </button>`;
}

export function renderDevToolsSection(isHost: boolean): string {
  if (!isHost) return '';
  return `
    <section id="tab-dev-tools" class="tab-content hidden space-y-6">
      <div class="glass rounded-2xl p-6">
        <h2 class="text-xl font-bold text-white mb-1"><i class="fa-solid fa-screwdriver-wrench text-cyan-400 mr-2"></i> Dev Tools</h2>
        <p class="text-sm text-gray-400 mb-6">Host-only diagnostics and manual triggers.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div class="text-xs text-gray-500 uppercase tracking-wide">Feeds</div>
            <div id="dt-feed-count" class="text-2xl font-bold text-white">-</div>
          </div>
          <div class="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div class="text-xs text-gray-500 uppercase tracking-wide">Webhooks</div>
            <div id="dt-webhook-count" class="text-2xl font-bold text-white">-</div>
          </div>
          <div class="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div class="text-xs text-gray-500 uppercase tracking-wide">Monitors</div>
            <div id="dt-monitor-count" class="text-2xl font-bold text-white">-</div>
          </div>
          <div class="bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <div class="text-xs text-gray-500 uppercase tracking-wide">DB Size</div>
            <div id="dt-db-size" class="text-2xl font-bold text-white">-</div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 mb-6">
          <button onclick="triggerFeedPoll()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition">
            <i class="fa-solid fa-rotate mr-2"></i> Poll all feeds now
          </button>
          <button onclick="triggerStatusCheck()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition">
            <i class="fa-solid fa-heart-pulse mr-2"></i> Check all monitors now
          </button>
          <button onclick="refreshDevTools()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-white transition border border-gray-700">
            <i class="fa-solid fa-rotate-right mr-2"></i> Refresh
          </button>
        </div>

        <h3 class="text-sm font-semibold text-gray-300 mb-3">Service config</h3>
        <pre id="dt-config" class="bg-black/50 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto max-h-64 border border-gray-800">Loading...</pre>

        <h3 class="text-sm font-semibold text-gray-300 mt-6 mb-3">Recent activity</h3>
        <div class="overflow-x-auto rounded-xl border border-gray-800">
          <table class="w-full text-sm text-left text-gray-300">
            <thead class="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th class="px-4 py-2">Time</th>
                <th class="px-4 py-2">Level</th>
                <th class="px-4 py-2">Source</th>
                <th class="px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody id="dt-activity" class="divide-y divide-gray-800 bg-black/30">
              <tr><td colspan="4" class="px-4 py-3 text-gray-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>`;
}

export function renderDevToolsScript(): string {
  return `
    async function loadDevTools() {
      try {
        const [statsRes, activityRes, configRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/activity?limit=50'),
          fetch('/api/admin/config')
        ]);
        const stats = await statsRes.json();
        const activity = await activityRes.json();
        const config = await configRes.json();
        document.getElementById('dt-feed-count').textContent = stats.feedCount;
        document.getElementById('dt-webhook-count').textContent = stats.webhookCount;
        document.getElementById('dt-monitor-count').textContent = stats.monitorCount;
        document.getElementById('dt-db-size').textContent = Math.round(stats.dbSizeBytes / 1024) + ' KB';
        document.getElementById('dt-config').textContent = JSON.stringify(config, null, 2);
        const tbody = document.getElementById('dt-activity');
        tbody.innerHTML = '';
        if (!activity.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-gray-500">No activity yet.</td></tr>';
        } else {
          for (const row of activity) {
            const tr = document.createElement('tr');
            const levelColor = { debug: 'text-gray-400', info: 'text-cyan-400', warn: 'text-amber-400', error: 'text-red-400' }[row.level] || 'text-gray-400';
            tr.innerHTML = '<td class="px-4 py-2 font-mono text-xs text-gray-500">' + new Date(row.ts).toLocaleString() + '</td>' +
              '<td class="px-4 py-2 ' + levelColor + '">' + row.level + '</td>' +
              '<td class="px-4 py-2 text-gray-400">' + escapeHtml(row.source) + '</td>' +
              '<td class="px-4 py-2">' + escapeHtml(row.message) + '</td>';
            tbody.appendChild(tr);
          }
        }
      } catch (err) {
        console.error('Failed to load dev tools', err);
      }
    }

    async function triggerFeedPoll() {
      await fetch('/api/admin/trigger-feeds', { method: 'POST' });
      alert('Feed poll triggered in background.');
    }

    async function triggerStatusCheck() {
      await fetch('/api/admin/trigger-status', { method: 'POST' });
      alert('Status check triggered in background.');
    }

    function refreshDevTools() {
      loadDevTools();
      fetchStats();
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    const originalSwitchTab = switchTab;
    switchTab = function(name) {
      originalSwitchTab(name);
      if (name === 'dev-tools') loadDevTools();
    };`;
}
