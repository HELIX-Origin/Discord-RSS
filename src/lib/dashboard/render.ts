import type { AppDeps } from '../../app.js';
import { isOwnerUser, isAdminOrOwner } from '../../lib/routes/shared.js';
import { renderDevToolsNavItem, renderDevToolsSection, renderDevToolsScript } from '../../http/dev-tools.js';

export function renderDashboardHtml(deps: AppDeps, userId: number | null): string {
  const isOwner = isOwnerUser(userId, deps);
  const isAdmin = !isOwner && isAdminOrOwner(userId, deps);
  const canAccessSettings = isOwner || isAdmin;
  const isHost = canAccessSettings;
  const dbStats = deps.db.stats();
  const providers = deps.oauth.listProviders();
  const botInviteUrl = deps.config.clientId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(deps.config.clientId)}&scope=bot%20applications.commands&permissions=534723950656`
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HELIX RSS Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #0b0f19; color: #f3f4f6; }
    .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(55, 65, 81, 0.5); }
    .glow-cyan { text-shadow: 0 0 12px rgba(6, 182, 212, 0.6); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #111827; }
    ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
    .spinner-border { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body class="min-h-screen flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
  <!-- Top Navigation -->
  <header class="glass sticky top-0 z-50 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/30 border border-cyan-500/30 shrink-0 bg-gray-900 flex items-center justify-center">
        <i class="fa-solid fa-rss text-cyan-400 text-lg"></i>
      </div>
      <div>
        <h1 class="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
          HELIX <span class="text-cyan-400">RSS</span>
        </h1>
        <p class="text-xs text-gray-400">Feed &amp; status monitor for Discord communities</p>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      ${
        botInviteUrl
          ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white transition shadow-sm shadow-[#5865F2]/25">
        <i class="fa-brands fa-discord mr-1.5 text-sm"></i> Add Bot to Server
      </a>`
          : ''
      }
      <span id="db-badge" class="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800">
        <i class="fa-solid fa-database mr-1.5 text-xs text-emerald-400"></i> SQLite: ${Math.round(dbStats.dbSizeBytes / 1024)} KB
      </span>
      ${
        userId !== null
          ? `<span id="user-pill" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
        <i class="fa-solid fa-user mr-1.5 text-cyan-400"></i> <span id="user-email">Loading...</span>
      </span>
      <button onclick="logout()" title="Log out" class="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-red-900/70 text-gray-300 hover:text-white transition border border-gray-700">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
      </button>`
          : `<a href="/api/auth/discord" class="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white transition shadow-sm shadow-[#5865F2]/25">
        <i class="fa-brands fa-discord mr-1.5 text-sm"></i> Log In with Discord
      </a>`
      }
    </div>
  </header>

  <!-- Main Container -->
  <div class="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
    <!-- Sidebar Navigation -->
    <nav class="w-56 xl:w-64 glass rounded-2xl p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-7.5rem)] sticky top-20">
      <div class="space-y-1.5">
        <button onclick="switchTab('overview')" id="tab-btn-overview" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-white bg-cyan-600/20 text-cyan-300 border border-cyan-500/30">
          <i class="fa-solid fa-chart-line w-5"></i> Overview
        </button>
        <button onclick="switchTab('feeds')" id="tab-btn-feeds" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-rss w-5"></i> Feeds
        </button>
        <button onclick="switchTab('builder')" id="tab-btn-builder" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-wand-magic-sparkles w-5"></i> Feed Builder
        </button>
        <button onclick="switchTab('popular')" id="tab-btn-popular" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-star w-5"></i> Popular Feeds
        </button>
        <button onclick="switchTab('monitors')" id="tab-btn-monitors" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-heart-pulse w-5"></i> Status Monitors
        </button>
        ${renderDevToolsNavItem(isHost)}
        <button onclick="switchTab('integrations')" id="tab-btn-integrations" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-cloud w-5"></i> Integrations
        </button>
        ${
          isHost
            ? `<button onclick="switchTab('settings')" id="tab-btn-settings" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-sliders w-5"></i> Settings
        </button>`
            : ''
        }
      </div>

      <div class="p-3 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-400 space-y-1.5">
        <div class="flex justify-between"><span>Delivery:</span><span class="text-cyan-400 font-semibold">Direct to Discord</span></div>
        <div class="flex justify-between"><span>Parser:</span><span class="text-emerald-400 font-semibold">RSS · Atom</span></div>
        <div class="flex justify-between"><span>Database:</span><span class="text-emerald-400 font-mono">SQLite (node:sqlite)</span></div>
        <div class="flex justify-between"><span>Auth:</span><span class="text-indigo-400 font-mono">Discord OAuth</span></div>
      </div>
    </nav>

    <!-- Tab Contents -->
    <main class="flex-1 space-y-6 min-w-0">
      <!-- 1. OVERVIEW -->
      <section id="tab-overview" class="tab-content space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="glass p-5 rounded-2xl border border-gray-800">
            <span class="text-xs font-semibold uppercase text-gray-400 tracking-wider">My Feeds</span>
            <div class="text-3xl font-extrabold text-cyan-400 mt-2" id="stat-feeds">0</div>
            <span class="text-xs text-gray-500 mt-1 block">Active subscriptions</span>
          </div>
          <div class="glass p-5 rounded-2xl border border-gray-800">
            <span class="text-xs font-semibold uppercase text-gray-400 tracking-wider">Discord Delivery</span>
            <div class="text-3xl font-extrabold text-[#5865F2] mt-2" id="stat-channels">0</div>
            <span class="text-xs text-gray-500 mt-1 block">Connected channels</span>
          </div>
          <div class="glass p-5 rounded-2xl border border-gray-800">
            <span class="text-xs font-semibold uppercase text-gray-400 tracking-wider">Status Monitors</span>
            <div class="text-3xl font-extrabold text-indigo-400 mt-2" id="stat-monitors">0</div>
            <span class="text-xs text-gray-500 mt-1 block">Site uptime checks</span>
          </div>
          <div class="glass p-5 rounded-2xl border border-gray-800">
            <span class="text-xs font-semibold uppercase text-gray-400 tracking-wider">SQLite Engine</span>
            <div class="text-3xl font-extrabold text-emerald-400 mt-2">${Math.round(dbStats.dbSizeBytes / 1024)} KB</div>
            <span class="text-xs text-gray-500 mt-1 block">Local synchronous storage</span>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-cyan-400"></i> Recent Activity
            </h2>
            <button onclick="fetchAll()" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition flex items-center gap-1.5 border border-gray-700">
              <i class="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>
          <div id="activity-feed" class="space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
            <div class="text-gray-500 py-4 text-center">Loading recent activity...</div>
          </div>
        </div>
      </section>

      <!-- 2. FEEDS -->
      <section id="tab-feeds" class="tab-content hidden space-y-6">
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-square-plus text-cyan-400"></i> Add Feed
            </h2>
            <p class="text-xs text-gray-400 mt-1">Paste an RSS or Atom feed URL. Select the Discord channel where new entries should be delivered.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Feed Name</label>
              <input type="text" id="feed-name" placeholder="Example Blog" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Feed URL</label>
              <input type="text" id="feed-url" placeholder="https://example.com/feed.xml" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Destination Discord Channel</label>
              <select id="feed-webhook" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
                <option value="">-- Select Discord channel --</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end">
            <button onclick="addFeed()" class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-sm text-white transition flex items-center gap-2 shadow-lg shadow-cyan-600/20">
              <i class="fa-solid fa-plus"></i> Add Feed
            </button>
          </div>
        </div>

        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-list text-cyan-400"></i> My Feeds
            </h2>
            <button onclick="fetchAll()" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition flex items-center gap-1.5 border border-gray-700">
              <i class="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>
          <div id="feeds-table-body" class="space-y-2">
            <div class="text-gray-500 py-4 text-center font-mono text-xs">Loading feeds...</div>
          </div>
        </div>
      </section>

      <!-- 2.5 FEED BUILDER -->
      <section id="tab-builder" class="tab-content hidden space-y-6">
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-wand-magic-sparkles text-violet-400"></i> Analyze a Site
            </h2>
            <p class="text-xs text-gray-400 mt-1">Enter any page URL. If the site publishes an RSS/Atom feed we will find it automatically. If not, you can build a feed by scraping the page with selectors.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Page URL</label>
              <input type="text" id="builder-url" placeholder="https://example.com/forum/" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono">
            </div>
          </div>
          <div class="flex justify-end">
            <button onclick="analyzeBuilderUrl()" class="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white transition flex items-center gap-2 shadow-lg shadow-violet-600/20">
              <i class="fa-solid fa-magnifying-glass"></i> Analyze
            </button>
          </div>
          <div id="builder-result" class="hidden space-y-4"></div>
        </div>

        <div class="glass p-6 rounded-2xl border border-gray-800 hidden" id="builder-scrape-panel">
          <h2 class="text-base font-bold text-white flex items-center gap-2 mb-1">
            <i class="fa-solid fa-scissors text-violet-400"></i> Build a Scrape Feed
          </h2>
          <p class="text-xs text-gray-400 mb-4">No feed found, or want a custom view of the page? Use CSS selectors to pick repeating items. Test first, then save as a feed.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Feed Name</label>
              <input type="text" id="builder-feed-name" placeholder="Latest forum posts" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Destination Discord Channel</label>
              <select id="builder-feed-webhook" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="">-- Select Discord channel --</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Item Selector</label>
              <input type="text" id="builder-sel-item" placeholder="article.post-item" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Title Selector</label>
              <input type="text" id="builder-sel-title" placeholder="h2 a" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Link Selector</label>
              <input type="text" id="builder-sel-link" placeholder="a" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Description Selector (opt)</label>
              <input type="text" id="builder-sel-desc" placeholder="p.summary" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono">
            </div>
          </div>
          <div class="flex justify-between items-center pt-2">
            <button onclick="testBuilderSelectors()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition border border-gray-700 flex items-center gap-1.5">
              <i class="fa-solid fa-play"></i> Test Selectors
            </button>
            <button onclick="saveBuilderFeed()" class="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white transition flex items-center gap-2 shadow-lg shadow-violet-600/20">
              <i class="fa-solid fa-floppy-disk"></i> Save Scrape Feed
            </button>
          </div>
          <div id="builder-test-result" class="hidden space-y-3 pt-2"></div>
        </div>
      </section>

      <!-- 3. POPULAR FEEDS -->
      <section id="tab-popular" class="tab-content hidden space-y-6">
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-star text-amber-400"></i> Popular Feeds
            </h2>
            <p class="text-xs text-gray-400 mt-1">One-click subscribe to top news, tech, science, and gaming feeds into any Discord channel.</p>
          </div>
          <div id="presets-body" class="space-y-4">
            <div class="text-gray-500 py-4 text-center font-mono text-xs">Loading popular feeds...</div>
          </div>
        </div>
      </section>

      <!-- 4. STATUS MONITORS -->
      <section id="tab-monitors" class="tab-content hidden space-y-6">
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-square-plus text-indigo-400"></i> Add Status Monitor
            </h2>
            <p class="text-xs text-gray-400 mt-1">Poll a site URL. Transition notifications are posted to the selected Discord channel when a site goes down or recovers.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Monitor Name</label>
              <input type="text" id="monitor-name" placeholder="Main Site" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Site URL</label>
              <input type="text" id="monitor-url" placeholder="https://example.com" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Alert Discord Channel</label>
              <select id="monitor-webhook" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option value="">-- Select Discord channel --</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end">
            <button onclick="addMonitor()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/20">
              <i class="fa-solid fa-plus"></i> Add Monitor
            </button>
          </div>
        </div>

        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-heart-pulse text-indigo-400"></i> Monitored Sites
          </h2>
          <div id="monitors-table-body" class="space-y-2">
            <div class="text-gray-500 py-4 text-center font-mono text-xs">Loading monitors...</div>
          </div>
        </div>
      </section>

      <!-- 6. INTEGRATIONS (OAuth) -->
      <section id="tab-integrations" class="tab-content hidden space-y-6">
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-cloud text-cyan-400"></i> Feed Provider Connections
          </h2>
          <p class="text-xs text-gray-400">
            Connect accounts so feeds behind login walls or Cloudflare-protected domains can be fetched.
            Previously connected providers are shown below.
          </p>
          <div id="connections-body" class="space-y-3">
            <div class="text-gray-500 py-4 text-center font-mono text-xs">Loading connections...</div>
          </div>
        </div>
      </section>

      ${
        isHost
          ? `<!-- 7. SETTINGS -->
      <section id="tab-settings" class="tab-content hidden space-y-6">
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-sliders text-indigo-400"></i> Service Settings
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-2">
              <span class="font-bold text-cyan-400">Public Base URL</span>
              <p class="text-xs text-gray-400">Where this dashboard is reachable (used for OAuth redirect URIs).</p>
              <input type="text" id="setting-base-url" placeholder="http://localhost:3434" class="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500">
            </div>
          </div>
          <div class="flex justify-end">
            <button onclick="saveSettings()" class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-sm text-white transition flex items-center gap-2 shadow-lg shadow-cyan-600/20">
              <i class="fa-solid fa-floppy-disk"></i> Save Settings
            </button>
          </div>
        </div>

        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-key text-amber-400"></i> OAuth Provider Credentials
          </h2>
          <p class="text-xs text-gray-400">Configure client credentials for each feed provider. These are stored in SQLite and used when connecting accounts.</p>
          <div id="oauth-config-body" class="space-y-3">
            ${providers
              .map(
                (p) => `
              <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-bold text-white">${p.label}</span>
                    <p class="text-xs text-gray-400 mt-0.5">${p.description}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono ${p.configured ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
                    ${p.configured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-semibold uppercase text-gray-500 mb-1">Client ID</label>
                    <input type="text" id="cfg-${p.provider}-client-id" placeholder="Client ID" class="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500">
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold uppercase text-gray-500 mb-1">Client Secret</label>
                    <input type="password" id="cfg-${p.provider}-client-secret" placeholder="Client Secret" class="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500">
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <label class="inline-flex items-center text-xs text-gray-300 cursor-pointer">
                    <input type="checkbox" id="cfg-${p.provider}-enabled" class="mr-2 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0"> Enabled
                  </label>
                  <button onclick="saveOauthProvider('${p.provider}')" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md shadow-amber-600/20">
                    <i class="fa-solid fa-floppy-disk"></i> Save
                  </button>
                </div>
              </div>`,
              )
              .join('')}
          </div>
        </div>

        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-users-gear text-purple-400"></i> User Permissions &amp; Roles
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                ${
                  isOwner
                    ? 'Manage registered users and assign administrator permissions. Administrators can configure service settings and API credentials.'
                    : 'View registered users and roles. Only the Owner can promote or demote administrators.'
                }
              </p>
            </div>
            ${
              isOwner
                ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800"><i class="fa-solid fa-crown mr-1.5 text-amber-400"></i>Owner Controls</span>'
                : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800"><i class="fa-solid fa-shield-halved mr-1.5 text-purple-400"></i>Admin (Read-Only)</span>'
            }
          </div>
          <div id="users-table-body" class="space-y-2">
            <div class="text-gray-500 py-4 text-center font-mono text-xs">Loading user list...</div>
          </div>
        </div>

        <!-- Member Feed Health & Diagnostics Card -->
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-stethoscope text-emerald-400"></i> Member Feed Health &amp; Diagnostics
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Scan all member feeds across the system to detect missing webhooks, disabled endpoints, Cloudflare blocks, and configuration errors.
              </p>
            </div>
            <button onclick="fetchFeedDiagnostics()" class="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition border border-gray-700 flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
              <i class="fa-solid fa-rotate-right"></i> Scan Feeds
            </button>
          </div>

          <!-- Diagnostic Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
              <div class="text-[10px] uppercase font-semibold text-gray-500">Total Feeds</div>
              <div id="diag-total-feeds" class="text-xl font-bold text-white mt-1">-</div>
            </div>
            <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
              <div class="text-[10px] uppercase font-semibold text-gray-500">Issues Detected</div>
              <div id="diag-issues-count" class="text-xl font-bold text-amber-400 mt-1">-</div>
            </div>
            <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
              <div class="text-[10px] uppercase font-semibold text-gray-500">Missing Webhooks</div>
              <div id="diag-missing-webhooks" class="text-xl font-bold text-red-400 mt-1">-</div>
            </div>
            <div class="p-3 rounded-xl bg-gray-900 border border-gray-800">
              <div class="text-[10px] uppercase font-semibold text-gray-500">Healthy Feeds</div>
              <div id="diag-healthy-count" class="text-xl font-bold text-emerald-400 mt-1">-</div>
            </div>
          </div>

          <!-- Detected Configuration Issues List -->
          <div class="space-y-2 pt-2">
            <div class="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-amber-400"></i> Member Feeds with Configuration Issues
            </div>
            <div id="diag-issues-body" class="space-y-2">
              <div class="text-gray-500 py-4 text-center font-mono text-xs">Scanning feeds for issues...</div>
            </div>
          </div>

          <!-- Live Feed Diagnostic Tester for Admins -->
          <div class="pt-4 border-t border-gray-800/80 space-y-3">
            <div class="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <i class="fa-solid fa-magnifying-glass-chart text-cyan-400"></i> Live Feed Inspector
            </div>
            <p class="text-xs text-gray-400">Test any member feed or custom URL to inspect response headers, cloudflare challenges, and article parsing.</p>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div class="md:col-span-2">
                <input type="text" id="diag-test-url" placeholder="https://example.com/feed.xml" class="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <select id="diag-test-feed-select" onchange="selectDiagnosticFeed(this.value)" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="">-- Quick select a feed --</option>
                </select>
              </div>
              <div>
                <button onclick="runLiveFeedDiagnostic()" class="w-full h-full min-h-[42px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold text-xs text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20">
                  <i class="fa-solid fa-stethoscope"></i> Run Diagnostic
                </button>
              </div>
            </div>
            <div id="diag-test-result" class="hidden p-4 rounded-xl text-xs font-mono bg-gray-900 border border-gray-800 space-y-3"></div>
          </div>
        </div>
      </section>`
          : ''
      }
      ${renderDevToolsSection(isHost)}
    </main>
  </div>

  <!-- Member Feeds Inspection Modal -->
  <div id="member-feeds-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 hidden">
    <div class="glass w-full max-w-3xl rounded-2xl border border-gray-700 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-5 border-b border-gray-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <i class="fa-solid fa-folder-tree"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2" id="modal-member-title">Member Feeds</h3>
            <p class="text-xs text-gray-400" id="modal-member-subtitle">Inspect configuration and webhooks</p>
          </div>
        </div>
        <button onclick="closeMemberFeedsModal()" class="h-8 w-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div id="modal-member-body" class="p-5 overflow-y-auto space-y-3 flex-1">
        <div class="text-gray-500 py-6 text-center font-mono text-xs">Loading member feeds...</div>
      </div>
    </div>
  </div>

  <script>
    let discordGuildsCache = [];
    let presetsCache = [];
    let botInviteUrlCache = null;
    let discordBotEnabled = false;

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-cyan-600/20', 'text-cyan-300', 'border', 'border-cyan-500/30');
        btn.classList.add('text-gray-400');
      });
      const target = document.getElementById('tab-' + tabId);
      const btn = document.getElementById('tab-btn-' + tabId);
      if (target) target.classList.remove('hidden');
      if (btn) {
        btn.classList.add('bg-cyan-600/20', 'text-cyan-300', 'border', 'border-cyan-500/30');
        btn.classList.remove('text-gray-400');
      }
    }

    async function logout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }

    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
          document.getElementById('user-email').textContent = data.user.email;
          renderConnections(data);
        }
      } catch {}
    }

    function renderConnections(data) {
      const container = document.getElementById('connections-body');
      const connected = data.connections || [];
      container.innerHTML = data.oauthProviders.map(p => {
        const conn = connected.find(c => c.provider === p.provider);
        const statusClass = conn ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-gray-800 text-gray-400 border border-gray-700';
        return \`
          <div class="p-4 rounded-xl \${conn ? 'bg-gray-900/90' : 'bg-gray-900'} border border-gray-800 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <i class="fa-solid fa-cloud text-cyan-400 text-xl"></i>
              <div>
                <span class="font-bold text-white text-sm">\${p.label}</span>
                <span class="text-xs text-gray-400 block">\${p.description}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono \${statusClass}">\${conn ? 'Connected' : (p.configured ? 'Available' : 'Not configured')}</span>
              \${conn
                ? \`<button onclick="disconnect('\${p.provider}')" class="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-xs border border-red-800 transition"><i class="fa-solid fa-unlink mr-1"></i>Disconnect</button>\`
                : \`<button onclick="connect('\${p.provider}')" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"><i class="fa-solid fa-link mr-1"></i>Connect</button>\`}
            </div>
          </div>\`;
      }).join('');
    }

    async function connect(provider) {
      try {
        const res = await fetch('/api/oauth/' + provider + '/connect');
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank', 'noopener');
        } else {
          alert(data.error || 'Unable to start connection');
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function disconnect(provider) {
      if (!confirm('Disconnect ' + provider + '?')) return;
      try {
        await fetch('/api/oauth/' + provider, { method: 'DELETE' });
        fetchMe();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function buildChannelOptionsHtml(currentValue) {
      if (!discordGuildsCache || !discordGuildsCache.length) {
        if (botInviteUrlCache) {
          return '<option value="">-- No channels found (Invite bot to server first) --</option>';
        }
        return '<option value="">-- No Discord channels available --</option>';
      }
      let html = '<option value="">-- Select Discord channel --</option>';
      discordGuildsCache.forEach(g => {
        const channels = g.channels || [];
        if (channels.length) {
          html += \`<optgroup label="\${escapeHtmlAttr(g.name)}">\`;
          channels.forEach(ch => {
            const val = 'channel:' + ch.id;
            const selected = (currentValue === val || currentValue === ch.id) ? 'selected' : '';
            html += \`<option value="\${val}" \${selected}>#\${escapeHtmlAttr(ch.name)}</option>\`;
          });
          html += '</optgroup>';
        }
      });
      return html;
    }

    function populateDestinationSelects() {
      const feedsSel = document.getElementById('feed-webhook');
      const monitorsSel = document.getElementById('monitor-webhook');
      const builderSel = document.getElementById('builder-feed-webhook');
      if (feedsSel) feedsSel.innerHTML = buildChannelOptionsHtml(feedsSel.value);
      if (monitorsSel) monitorsSel.innerHTML = buildChannelOptionsHtml(monitorsSel.value);
      if (builderSel) builderSel.innerHTML = buildChannelOptionsHtml(builderSel.value);
      refreshPresetWebhookOptions();
    }

    function refreshPresetWebhookOptions() {
      document.querySelectorAll('select[data-preset-webhook]').forEach(sel => {
        sel.innerHTML = buildChannelOptionsHtml(sel.value);
      });
    }

    async function fetchDiscordChannels() {
      try {
        const res = await fetch('/api/discord/channels');
        if (res.status === 401 || res.status === 403) return;
        const data = await res.json();
        discordGuildsCache = data.guilds || [];
        botInviteUrlCache = data.botInviteUrl;
        discordBotEnabled = Boolean(data.botEnabled);
        populateDestinationSelects();
        const statChannels = document.getElementById('stat-channels');
        if (statChannels) {
          const total = discordGuildsCache.reduce((acc, g) => acc + (g.channels?.length || 0), 0);
          statChannels.textContent = total;
        }
      } catch {}
    }

    function parseDestinationPayload(destination) {
      if (!destination) return {};
      if (destination.startsWith('channel:')) {
        return { channelId: destination.replace('channel:', '') };
      }
      if (destination.startsWith('webhook:')) {
        return { webhookId: Number(destination.replace('webhook:', '')) };
      }
      if (/^[0-9]+$/.test(destination)) {
        return { channelId: destination };
      }
      return {};
    }

    async function fetchPresets() {
      const res = await fetch('/api/presets');
      const presets = await res.json();
      presetsCache = presets;

      const groups = {};
      presets.forEach(p => {
        (groups[p.category] = groups[p.category] || []).push(p);
      });

      const container = document.getElementById('presets-body');
      if (!presets.length) {
        container.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs">No popular feeds available.</div>';
        return;
      }

      container.innerHTML = Object.keys(groups).map(cat => \`
        <div class="mt-4 first:mt-0">
          <div class="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-2 flex items-center gap-2"><i class="fa-solid fa-folder-open"></i>\${escapeHtmlAttr(cat)}</div>
          <div class="space-y-2">
            \${groups[cat].map(p => \`
              <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-500/40 transition">
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-white text-sm">\${escapeHtmlAttr(p.name)}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded \${p.alreadyAdded ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}">\${p.alreadyAdded ? 'Added' : 'Popular'}</span>
                  </div>
                  <div class="text-xs text-gray-500">\${escapeHtmlAttr(p.description)}</div>
                  <div class="text-[10px] text-gray-500 font-mono truncate">\${escapeHtmlAttr(p.url)}</div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <select data-preset-webhook class="w-48 bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500">
                    <option value="">-- Select Discord channel --</option>
                  </select>
                  <button onclick="enablePreset('\${p.id}', this)" \${p.alreadyAdded ? 'disabled' : ''} class="px-3 py-2 rounded-lg \${p.alreadyAdded ? 'bg-green-950/60 text-green-400 border border-green-800 cursor-default' : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/40'} text-xs font-semibold transition"><i class="fa-solid \${p.alreadyAdded ? 'fa-check' : 'fa-bolt'} mr-1"></i>\${p.alreadyAdded ? 'Added' : 'Enable'}</button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`).join('');

      refreshPresetWebhookOptions();
    }

    async function enablePreset(presetId, btn) {
      const preset = presetsCache.find(p => p.id === presetId);
      if (!preset) return;
      const row = btn.closest('.flex');
      const sel = row ? row.querySelector('select[data-preset-webhook]') : null;
      const destination = sel ? sel.value : '';
      if (!destination) {
        if (botInviteUrlCache && (!discordGuildsCache || !discordGuildsCache.length)) {
          return alert('Please invite the Discord bot to your server first.');
        }
        return alert('Please select a destination Discord channel for "' + preset.name + '".');
      }
      const dest = parseDestinationPayload(destination);
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: preset.name, url: preset.url, feedType: 'rss', ...dest })
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        alert('Enabled "' + preset.name + '".');
        fetchPresets();
        fetchFeeds();
      } else {
        alert(data.error || 'Failed to enable feed');
      }
    }

    function checkAuthError(res) {
      if (res.status === 401) {
        if (confirm('You must be logged in to perform this action. Go to login page?')) {
          window.location.href = '/login';
        }
        return true;
      }
      return false;
    }

    async function fetchFeeds() {
      const res = await fetch('/api/feeds');
      const feeds = await res.json();
      const container = document.getElementById('feeds-table-body');
      if (!Array.isArray(feeds)) {
        container.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs">Sign in to view and manage feeds.</div>';
        document.getElementById('stat-feeds').textContent = '0';
        return;
      }
      if (!feeds.length) {
        container.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs">No feeds yet. Add one above.</div>';
        document.getElementById('stat-feeds').textContent = '0';
        return;
      }
      document.getElementById('stat-feeds').textContent = feeds.length;
      container.innerHTML = feeds.map(f => \`
        <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-cyan-500/40 transition">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">\${escapeHtmlAttr(f.name)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded \${f.enabled ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}">\${f.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div class="text-xs text-gray-400 font-mono truncate">\${escapeHtmlAttr(f.url)}</div>
            <div class="text-[10px] text-gray-500">Delivery: \${f.webhookId ? 'Discord Channel' : 'Not linked'} · Last checked: \${f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never'}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="toggleFeed(\${f.id}, \${f.enabled ? 'false' : 'true'})" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition border border-gray-700"><i class="fa-solid \${f.enabled ? 'fa-pause' : 'fa-play'} mr-1"></i>\${f.enabled ? 'Pause' : 'Resume'}</button>
            <button onclick="pollFeed(\${f.id})" title="Poll now" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition border border-gray-700"><i class="fa-solid fa-rotate"></i></button>
            <button onclick="deleteItem('feeds', \${f.id}, 'feed')" class="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-xs border border-red-800 transition"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      \`).join('');
    }

    async function fetchMonitors() {
      const res = await fetch('/api/monitors');
      const monitors = await res.json();
      const container = document.getElementById('monitors-table-body');
      if (!Array.isArray(monitors)) {
        container.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs">Sign in to view and manage monitors.</div>';
        document.getElementById('stat-monitors').textContent = '0';
        return;
      }
      if (!monitors.length) {
        container.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs">No monitors yet. Add one above.</div>';
        document.getElementById('stat-monitors').textContent = '0';
        return;
      }
      document.getElementById('stat-monitors').textContent = monitors.length;
      container.innerHTML = monitors.map(m => \`
        <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">\${escapeHtmlAttr(m.name)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded \${statusPillClass(m.status)}">\${escapeHtmlAttr(m.status)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded \${m.enabled ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}">\${m.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div class="text-xs text-gray-400 font-mono truncate">\${escapeHtmlAttr(m.url)}</div>
            <div class="text-[10px] text-gray-500">Alerts: \${m.webhookId ? 'Discord Channel' : 'No channel linked'} · Last checked: \${m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleString() : 'Never'}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="toggleMonitor(\${m.id}, \${m.enabled ? 'false' : 'true'})" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition border border-gray-700"><i class="fa-solid \${m.enabled ? 'fa-pause' : 'fa-play'} mr-1"></i>\${m.enabled ? 'Pause' : 'Resume'}</button>
            <button onclick="deleteItem('monitors', \${m.id}, 'monitor')" class="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-xs border border-red-800 transition"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      \`).join('');
    }

    function statusPillClass(status) {
      switch (status) {
        case 'online': return 'bg-green-950 text-green-300 border border-green-800';
        case 'down': return 'bg-red-950 text-red-300 border border-red-800';
        default: return 'bg-gray-800 text-gray-400 border border-gray-700';
      }
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        const feed = document.getElementById('activity-feed');
        if (feed && data.activity && data.activity.length) {
          feed.innerHTML = data.activity.map(a => \`
            <div class="p-3 rounded-xl bg-gray-900/90 border border-gray-800/80 flex justify-between items-center hover:border-cyan-500/40 transition">
              <div class="flex items-center gap-2">
                <span class="\${a.level === 'error' ? 'text-red-400' : a.level === 'warn' ? 'text-amber-400' : 'text-cyan-400'}"><i class="fa-solid \${a.level === 'error' ? 'fa-circle-exclamation' : a.level === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i></span>
                <span class="text-gray-300">\${a.message}</span>
              </div>
              <span class="text-[10px] text-gray-500 shrink-0">\${a.ts}</span>
            </div>
          \`).join('');
        } else if (feed) {
          feed.innerHTML = '<div class="text-gray-500 py-3 text-center">No activity recorded yet.</div>';
        }
      } catch {}
    }

    async function fetchSettings() {
      const baseUrlInput = document.getElementById('setting-base-url');
      if (!baseUrlInput) return;
      try {
        const res = await fetch('/api/settings');
        if (res.status === 401 || res.status === 403) return;
        const data = await res.json();
        baseUrlInput.value = data.publicBaseUrl || '';
        (data.oauthProviders || []).forEach(p => {
          // Credentials intentionally not echoed back; only show enabled state
          const enabledEl = document.getElementById('cfg-' + p.provider + '-enabled');
          if (enabledEl) enabledEl.checked = p.enabled;
        });
      } catch {}
    }

    async function builderSelectors() {
      return {
        itemSelector: document.getElementById('builder-sel-item').value.trim(),
        titleSelector: document.getElementById('builder-sel-title').value.trim(),
        linkSelector: document.getElementById('builder-sel-link').value.trim(),
        descriptionSelector: document.getElementById('builder-sel-desc').value.trim() || undefined
      };
    }

    function escapeHtmlAttr(s) {
      return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function analyzeBuilderUrl() {
      const url = document.getElementById('builder-url').value.trim();
      const resultBox = document.getElementById('builder-result');
      const scrapePanel = document.getElementById('builder-scrape-panel');
      scrapedItems = [];
      if (!url) return alert('Enter a page URL first.');
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Analyzing...</div>';
      try {
        const res = await fetch('/api/builder/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        scrapePanel.classList.add('hidden');
        if (!res.ok) {
          resultBox.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm"><i class="fa-solid fa-circle-exclamation mr-2"></i>' + escapeHtmlAttr(data.error || 'Analysis failed') + '</div>';
          return;
        }
        // Keep the analyzed URL for save
        builderUrlField = url;
        if (data.isFeedXml) {
          resultBox.innerHTML = '<div class="p-4 rounded-xl bg-green-950/60 border border-green-800 text-green-300 text-sm flex items-center gap-2"><i class="fa-solid fa-circle-check"></i>This URL <b>is already a feed</b> — just add it on the Feeds tab.</div>';
          return;
        }
        const feedLinks = data.discoveredFeeds || [];
        let html = '';
        html += '<div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">';
        if (feedLinks.length) {
          html += '<div class="flex items-center gap-2 text-sm text-green-300"><i class="fa-solid fa-circle-check"></i>Feed(s) auto-discovered on this page:</div>';
          html += feedLinks.map(u => '<div class="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/40 border border-gray-800">' +
            '<span class="text-xs font-mono text-gray-300 truncate">' + escapeHtmlAttr(u) + '</span>' +
            '<button onclick="addDiscoveredFeed(' + escapeHtmlAttr(u).replace(/'/g, "\\\\'") + ')" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition shrink-0"><i class="fa-solid fa-plus mr-1"></i>Add</button></div>')
            .join('');
        } else {
          html += '<div class="flex items-center gap-2 text-sm text-amber-300"><i class="fa-solid fa-circle-info"></i>No RSS/Atom feed was found on this page.</div>';
        }
        html += '</div>';
        resultBox.innerHTML = html;
        if (!feedLinks.length) scrapePanel.classList.remove('hidden');
      } catch (err) {
        resultBox.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm">Network error: ' + escapeHtmlAttr(err.message) + '</div>';
      }
    }

    async function addDiscoveredFeed(url) {
      const name = prompt('Feed name:', url.split('/').pop() || 'Feed');
      if (!name) return;
      const destination = document.getElementById('feed-webhook') ? document.getElementById('feed-webhook').value : '';
      const dest = parseDestinationPayload(destination);
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, feedType: 'rss', ...dest })
      });
      const data = await res.json();
      if (res.ok) { alert('Feed added.'); fetchAll(); switchTab('feeds'); }
      else alert(data.error || 'Failed to add feed');
    }

    let builderUrlField = '';
    let scrapedItems = [];

    async function testBuilderSelectors() {
      const url = builderUrlField || document.getElementById('builder-url').value.trim();
      const sel = builderSelectors();
      const outBox = document.getElementById('builder-test-result');
      if (!url) return alert('Analyze a URL first.');
      if (!sel.itemSelector || !sel.titleSelector || !sel.linkSelector) return alert('Item, title, and link selectors are required.');
      outBox.classList.remove('hidden');
      outBox.innerHTML = '<div class="text-gray-500 py-3 text-center font-mono text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Scraping page...</div>';
      try {
        const res = await fetch('/api/builder/scrape-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, selectors: sel })
        });
        const data = await res.json();
        if (!res.ok) {
          outBox.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm"><i class="fa-solid fa-circle-exclamation mr-2"></i>' + escapeHtmlAttr(data.error || 'Test failed') + '</div>';
          return;
        }
        scrapedItems = data.sample.entries;
        if (!scrapedItems.length) {
          outBox.innerHTML = '<div class="p-4 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-sm">No items matched these selectors. Try a different Item Selector.</div>';
          return;
        }
        outBox.innerHTML = '<div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-2">' +
          '<div class="text-xs font-semibold uppercase text-gray-400 tracking-wider">Sample of ' + scrapedItems.length + ' items</div>' +
          scrapedItems.map((it, i) => '<div class="p-2.5 rounded-lg bg-black/40 border border-gray-800">' +
            '<div class="text-sm text-white font-semibold">' + escapeHtmlAttr(it.title) + '</div>' +
            '<div class="text-[11px] text-gray-500 font-mono truncate">' + escapeHtmlAttr(it.url) + '</div>' +
            (it.description ? '<div class="text-xs text-gray-400 mt-1 line-clamp-2">' + escapeHtmlAttr(it.description) + '</div>' : '') +
          '</div>').join('') + '</div>';
      } catch (err) {
        outBox.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm">Network error: ' + escapeHtmlAttr(err.message) + '</div>';
      }
    }

    async function saveBuilderFeed() {
      const url = builderUrlField || document.getElementById('builder-url').value.trim();
      const sel = builderSelectors();
      const destination = document.getElementById('builder-feed-webhook').value;
      const nameEl = document.getElementById('builder-feed-name');
      const feedName = nameEl.value.trim() || url.split('/').pop() || 'Scrape Feed';
      if (!url || !sel.itemSelector || !sel.titleSelector || !sel.linkSelector) return alert('Analyze a URL and set all selectors first.');
      const dest = parseDestinationPayload(destination);
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feedName,
          url,
          feedType: 'scrape',
          scrape: { item: sel.itemSelector, title: sel.titleSelector, link: sel.linkSelector, description: sel.descriptionSelector },
          ...dest
        })
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (res.ok) { alert('Scrape feed saved.'); fetchAll(); switchTab('feeds'); }
      else alert(data.error || 'Failed to save scrape feed');
    }

    async function fetchAll() {
      const tasks = [fetchMe(), fetchStats(), fetchFeeds(), fetchDiscordChannels(), fetchMonitors(), fetchPresets()];
      if (document.getElementById('setting-base-url') || document.getElementById('users-table-body')) {
        tasks.push(fetchSettings());
        tasks.push(fetchUsers());
        tasks.push(fetchFeedDiagnostics());
      }
      await Promise.all(tasks);
    }

    async function addFeed() {
      const name = document.getElementById('feed-name').value.trim();
      const url = document.getElementById('feed-url').value.trim();
      const destination = document.getElementById('feed-webhook').value;
      if (!name || !url) return alert('Please provide a feed name and URL.');
      const dest = parseDestinationPayload(destination);
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, feedType: 'rss', ...dest })
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        document.getElementById('feed-name').value = '';
        document.getElementById('feed-url').value = '';
        fetchAll();
      } else {
        alert(data.error || 'Failed to add feed');
      }
    }

    async function addMonitor() {
      const name = document.getElementById('monitor-name').value.trim();
      const url = document.getElementById('monitor-url').value.trim();
      const destination = document.getElementById('monitor-webhook').value;
      if (!name || !url) return alert('Please provide a monitor name and URL.');
      const dest = parseDestinationPayload(destination);
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, ...dest })
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (res.ok) {
        document.getElementById('monitor-name').value = '';
        document.getElementById('monitor-url').value = '';
        fetchAll();
      } else {
        alert(data.error || 'Failed to add monitor');
      }
    }

    async function toggleFeed(id, enabled) {
      const res = await fetch('/api/feeds/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      if (checkAuthError(res)) return;
      fetchAll();
    }

    async function toggleMonitor(id, enabled) {
      const res = await fetch('/api/monitors/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      if (checkAuthError(res)) return;
      fetchAll();
    }

    async function pollFeed(id) {
      const res = await fetch('/api/feeds/' + id + '/poll', { method: 'POST' });
      if (checkAuthError(res)) return;
      fetchAll();
    }

    async function deleteItem(collection, id, label) {
      if (!confirm('Delete this ' + label + '?')) return;
      const res = await fetch('/api/' + collection + '/' + id, { method: 'DELETE' });
      if (checkAuthError(res)) return;
      fetchAll();
    }

    async function saveOauthProvider(provider) {
      const clientId = document.getElementById('cfg-' + provider + '-client-id').value.trim();
      const clientSecret = document.getElementById('cfg-' + provider + '-client-secret').value.trim();
      const enabled = document.getElementById('cfg-' + provider + '-enabled').checked;
      const res = await fetch('/api/settings/oauth/' + provider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret, enabled })
      });
      if (checkAuthError(res)) return;
      const data = await res.json();
      if (res.ok) alert('Saved ' + provider + ' config.');
      else alert(data.error || 'Failed to save config');
      fetchMe();
    }

    async function saveSettings() {
      const publicBaseUrl = document.getElementById('setting-base-url').value.trim();
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicBaseUrl })
      });
      if (checkAuthError(res)) return;
      alert('Settings saved.');
    }

    async function fetchUsers() {
      const container = document.getElementById('users-table-body');
      if (!container) return;
      try {
        const res = await fetch('/api/settings/users');
        if (res.status === 401 || res.status === 403) return;
        const users = await res.json();
        if (!Array.isArray(users) || !users.length) {
          container.innerHTML = '<div class="text-gray-500 py-4 text-center font-mono text-xs">No registered users found.</div>';
          return;
        }
        const isOwnerUser = ${isOwner ? 'true' : 'false'};
        container.innerHTML = users.map(u => {
          const roleBadge = u.role === 'owner'
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-crown text-amber-400"></i> Owner</span>'
            : u.role === 'admin'
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-shield-halved text-purple-400"></i> Admin</span>'
            : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400 border border-gray-700 flex items-center gap-1 shrink-0"><i class="fa-solid fa-user text-gray-400"></i> Member</span>';

          const healthBadge = (u.feedsWithIssuesCount > 0)
            ? \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-triangle-exclamation text-amber-400"></i> \${u.feedsWithIssuesCount} issue\${u.feedsWithIssuesCount === 1 ? '' : 's'}</span>\`
            : (u.feedCount > 0)
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-circle-check text-emerald-400"></i> Healthy</span>'
            : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-500 border border-gray-700 flex items-center gap-1 shrink-0">No feeds</span>';

          let actionHtml = '';
          if (isOwnerUser) {
            if (u.role === 'member' || u.role === 'user') {
              actionHtml = \`<button onclick="updateUserRole(\${u.id}, 'admin')" class="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs border border-purple-700 transition font-semibold flex items-center gap-1.5 shrink-0"><i class="fa-solid fa-shield-halved"></i> Promote to Admin</button>\`;
            } else if (u.role === 'admin') {
              actionHtml = \`<button onclick="updateUserRole(\${u.id}, 'member')" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-red-900/70 text-gray-300 hover:text-white text-xs border border-gray-700 transition flex items-center gap-1.5 shrink-0"><i class="fa-solid fa-arrow-down"></i> Demote to Member</button>\`;
            } else {
              actionHtml = '<span class="text-[11px] text-gray-500 italic shrink-0">Primary Host</span>';
            }
          }

          const safeUserName = escapeHtmlAttr(u.displayName || u.email).replace(/'/g, "\\\\'");

          return \`
            <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-gray-700 transition">
              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-white text-sm">\${escapeHtmlAttr(u.displayName || u.email)}</span>
                  \${roleBadge}
                  \${healthBadge}
                </div>
                <div class="text-xs text-gray-400 font-mono truncate">\${escapeHtmlAttr(u.email)}</div>
                <div class="text-[10px] text-gray-500 font-mono">User ID: #\${u.id} · Feeds: \${u.feedCount} · Webhooks: \${u.webhookCount} · Joined: \${new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
              <div class="flex items-center gap-2 flex-wrap shrink-0">
                <button onclick="inspectUserFeeds(\${u.id}, '\${safeUserName}')" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-cyan-950/80 text-cyan-300 hover:text-cyan-200 text-xs border border-gray-700 hover:border-cyan-700 transition font-semibold flex items-center gap-1.5 shrink-0">
                  <i class="fa-solid fa-stethoscope text-cyan-400"></i> Inspect Feeds
                </button>
                \${actionHtml}
              </div>
            </div>\`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="text-red-400 py-4 text-center font-mono text-xs">Failed to load users.</div>';
      }
    }

    async function updateUserRole(userId, newRole) {
      if (!confirm('Are you sure you want to change user #' + userId + ' role to ' + newRole + '?')) return;
      try {
        const res = await fetch('/api/settings/users/' + userId + '/role', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });
        if (checkAuthError(res)) return;
        const data = await res.json();
        if (res.ok) {
          alert('User role updated successfully.');
          fetchUsers();
        } else {
          alert(data.error || 'Failed to update user role');
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function inspectUserFeeds(userId, userName) {
      const modal = document.getElementById('member-feeds-modal');
      const title = document.getElementById('modal-member-title');
      const subtitle = document.getElementById('modal-member-subtitle');
      const body = document.getElementById('modal-member-body');
      if (!modal || !body) return;

      title.textContent = 'Member Feeds: ' + userName;
      subtitle.textContent = 'User #' + userId + ' · Feeds and webhook diagnostics';
      body.innerHTML = '<div class="text-gray-400 py-6 text-center font-mono text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading member feeds...</div>';
      modal.classList.remove('hidden');

      try {
        const res = await fetch('/api/settings/users/' + userId + '/feeds');
        if (res.status === 401 || res.status === 403) {
          body.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono">Unauthorized. Admin permissions required.</div>';
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          body.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono">' + escapeHtmlAttr(data.error || 'Failed to load feeds') + '</div>';
          return;
        }

        const feeds = data.feeds || [];
        if (!feeds.length) {
          body.innerHTML = '<div class="p-6 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 text-center font-mono text-xs">This member has not configured any feeds yet.</div>';
          return;
        }

        body.innerHTML = feeds.map(f => {
          const statusBadge = f.enabled
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-green-950 text-green-300 border border-green-800">Active</span>'
            : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400 border border-gray-700">Paused</span>';

          const webhookBadge = f.webhookId === null
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 flex items-center gap-1"><i class="fa-solid fa-link-slash"></i> No Webhook</span>'
            : f.webhookEnabled
            ? \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1"><i class="fa-solid fa-link"></i> \${escapeHtmlAttr(f.webhookName || 'Webhook #' + f.webhookId)}</span>\`
            : \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> \${escapeHtmlAttr(f.webhookName || 'Webhook #' + f.webhookId)} (Disabled)</span>\`;

          const issuesHtml = (f.issues && f.issues.length)
            ? \`<div class="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs space-y-1">
                <div class="font-bold flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> Diagnostics:</div>
                <ul class="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90">
                  \${f.issues.map(iss => \`<li>\${escapeHtmlAttr(iss)}</li>\`).join('')}
                </ul>
              </div>\`
            : '';

          const safeUrl = escapeHtmlAttr(f.url).replace(/'/g, "\\\\'");

          return \`
            <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-white text-sm">\${escapeHtmlAttr(f.name)}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-300 border border-gray-700 uppercase">\${escapeHtmlAttr(f.feedType)}</span>
                  \${statusBadge}
                  \${webhookBadge}
                </div>
                <button onclick="testFeedFromModal('\${safeUrl}')" class="px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-xs font-semibold transition border border-emerald-700 flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <i class="fa-solid fa-stethoscope"></i> Test in Inspector
                </button>
              </div>
              <div class="text-xs text-gray-400 font-mono truncate bg-black/40 p-2 rounded-lg border border-gray-800">\${escapeHtmlAttr(f.url)}</div>
              <div class="text-[10px] text-gray-500 font-mono">Last checked: \${f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never polled'}</div>
              \${issuesHtml}
            </div>\`;
        }).join('');
      } catch (err) {
        body.innerHTML = '<div class="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono">Failed to fetch member feeds: ' + escapeHtmlAttr(err.message) + '</div>';
      }
    }

    function closeMemberFeedsModal() {
      const modal = document.getElementById('member-feeds-modal');
      if (modal) modal.classList.add('hidden');
    }

    function testFeedFromModal(feedUrl) {
      closeMemberFeedsModal();
      switchTab('settings');
      testSpecificFeed(feedUrl);
    }

    let diagnosticsFeedsCache = [];

    async function fetchFeedDiagnostics() {
      const issuesBody = document.getElementById('diag-issues-body');
      if (!issuesBody) return;
      try {
        const res = await fetch('/api/settings/diagnostics/feeds');
        if (res.status === 401 || res.status === 403) return;
        const data = await res.json();
        if (!res.ok) return;

        diagnosticsFeedsCache = data.allFeeds || [];

        const totalEl = document.getElementById('diag-total-feeds');
        const issuesEl = document.getElementById('diag-issues-count');
        const missingWhEl = document.getElementById('diag-missing-webhooks');
        const healthyEl = document.getElementById('diag-healthy-count');

        if (totalEl) totalEl.textContent = data.totalFeeds;
        if (issuesEl) issuesEl.textContent = data.issuesCount;
        if (missingWhEl) missingWhEl.textContent = data.stats?.missingWebhookCount ?? 0;
        if (healthyEl) healthyEl.textContent = data.healthyFeedsCount;

        const selectEl = document.getElementById('diag-test-feed-select');
        if (selectEl && data.allFeeds) {
          selectEl.innerHTML = '<option value="">-- Quick select a feed (' + data.allFeeds.length + ' total) --</option>' +
            data.allFeeds.map(f => \`<option value="\${escapeHtmlAttr(f.url)}">\${escapeHtmlAttr(f.name)} (\${escapeHtmlAttr(f.userEmail)})</option>\`).join('');
        }

        const issues = data.feedsWithIssues || [];
        if (!issues.length) {
          issuesBody.innerHTML = \`<div class="p-4 rounded-xl bg-green-950/40 border border-green-800/80 text-green-300 text-xs flex items-center gap-2.5 font-mono"><i class="fa-solid fa-circle-check text-emerald-400 text-base shrink-0"></i><span>All \${data.totalFeeds} member feeds across the system are configured correctly with active webhooks.</span></div>\`;
          return;
        }

        issuesBody.innerHTML = issues.map(item => {
          const safeUrl = escapeHtmlAttr(item.feedUrl).replace(/'/g, "\\\\'");
          return \`
            <div class="p-4 rounded-xl bg-gray-900 border border-amber-900/40 hover:border-amber-700/60 transition space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-white text-sm">\${escapeHtmlAttr(item.feedName)}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400 border border-gray-700 uppercase">\${escapeHtmlAttr(item.feedType)}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800"><i class="fa-solid fa-user mr-1 text-[9px]"></i>\${escapeHtmlAttr(item.userDisplayName || item.userEmail)}</span>
                </div>
                <button onclick="testSpecificFeed('\${safeUrl}')" class="px-3 py-1.5 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-emerald-200 text-xs font-semibold transition border border-emerald-700 flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <i class="fa-solid fa-stethoscope"></i> Test in Inspector
                </button>
              </div>
              <div class="text-xs text-gray-400 font-mono truncate bg-black/40 p-2 rounded-lg border border-gray-800">\${escapeHtmlAttr(item.feedUrl)}</div>
              <div class="space-y-2 pt-1">
                \${item.problems.map(p => {
                  const badgeClass = p.severity === 'error'
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : p.severity === 'warning'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                    : 'bg-blue-950/80 text-blue-300 border-blue-800';
                  return \`
                    <div class="p-2.5 rounded-lg bg-black/30 border border-gray-800 text-xs space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold border uppercase \${badgeClass}">\${p.title}</span>
                        <span class="text-gray-300">\${escapeHtmlAttr(p.description)}</span>
                      </div>
                      <div class="text-[11px] text-cyan-300/90 pl-1"><i class="fa-solid fa-arrow-right mr-1 text-[10px]"></i>\${escapeHtmlAttr(p.recommendation)}</div>
                    </div>\`;
                }).join('')}
              </div>
            </div>\`;
        }).join('');
      } catch (err) {
        issuesBody.innerHTML = '<div class="text-red-400 py-4 text-center font-mono text-xs">Failed to load feed diagnostics.</div>';
      }
    }

    function selectDiagnosticFeed(url) {
      if (url) {
        const input = document.getElementById('diag-test-url');
        if (input) input.value = url;
      }
    }

    function testSpecificFeed(url) {
      const input = document.getElementById('diag-test-url');
      if (input) input.value = url;
      runLiveFeedDiagnostic();
    }

    async function runLiveFeedDiagnostic() {
      const urlInput = document.getElementById('diag-test-url');
      const outBox = document.getElementById('diag-test-result');
      if (!urlInput || !outBox) return;

      const url = urlInput.value.trim();
      if (!url) return alert('Enter or select a feed URL to inspect.');

      outBox.classList.remove('hidden');
      outBox.innerHTML = '<div class="text-gray-400 py-3 text-center font-mono text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Testing feed connectivity, Cloudflare challenges, and article parsing...</div>';

      try {
        const res = await fetch('/api/settings/diagnostics/feed-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (!res.ok) {
          outBox.innerHTML = '<div class="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono"><i class="fa-solid fa-circle-exclamation mr-1.5"></i>' + escapeHtmlAttr(data.error || 'Diagnostic check failed') + '</div>';
          return;
        }

        const statusPill = data.status === 200
          ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-green-950 text-green-300 border border-green-800 font-bold">200 OK</span>'
          : \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 font-bold">\${data.status} \${escapeHtmlAttr(data.statusText || 'Error')}</span>\`;

        const challengePill = data.challenged
          ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 font-bold"><i class="fa-solid fa-shield-virus text-amber-400"></i> Cloudflare Block</span>'
          : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-bold"><i class="fa-solid fa-shield-halved text-emerald-400"></i> Passed (No Block)</span>';

        const parsePill = data.isXml
          ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">XML RSS/Atom</span>'
          : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">HTML Webpage</span>';

        let latestEntryHtml = '';
        if (data.latestEntry) {
          latestEntryHtml = \`
            <div class="p-3 rounded-lg bg-black/40 border border-gray-800 space-y-1">
              <div class="text-[10px] uppercase font-semibold text-gray-500">Latest Discovered Article:</div>
              <div class="text-xs font-bold text-white">\${escapeHtmlAttr(data.latestEntry.title || 'Untitled')}</div>
              <div class="text-[11px] text-gray-400 font-mono truncate">\${escapeHtmlAttr(data.latestEntry.link || '')}</div>
              \${data.latestEntry.publishedAt ? \`<div class="text-[10px] text-gray-500 font-mono">Published: \${escapeHtmlAttr(data.latestEntry.publishedAt)}</div>\` : ''}
            </div>\`;
        }

        let recommendationsHtml = '';
        if (data.recommendations && data.recommendations.length) {
          recommendationsHtml = \`
            <div class="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 space-y-1 text-xs">
              <div class="font-bold text-amber-300 flex items-center gap-1.5"><i class="fa-solid fa-lightbulb"></i> Recommendations:</div>
              <ul class="list-disc list-inside text-amber-200/90 text-[11px] space-y-0.5">
                \${data.recommendations.map(r => \`<li>\${escapeHtmlAttr(r)}</li>\`).join('')}
              </ul>
            </div>\`;
        }

        outBox.innerHTML = \`
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-gray-800">
              <div class="flex items-center gap-2 flex-wrap">
                \${statusPill}
                \${challengePill}
                \${parsePill}
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-300 border border-gray-700">\${data.entriesCount} article\${data.entriesCount === 1 ? '' : 's'} parsed</span>
              </div>
              <div class="text-[10px] text-gray-500 font-mono truncate">\${escapeHtmlAttr(data.contentType || 'unknown')}</div>
            </div>
            \${data.feedTitle ? \`<div class="text-xs font-bold text-white"><span class="text-gray-400 font-normal">Feed Title:</span> \${escapeHtmlAttr(data.feedTitle)}</div>\` : ''}
            \${data.parseError ? \`<div class="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono"><i class="fa-solid fa-circle-exclamation mr-1.5"></i>Parse Warning: \${escapeHtmlAttr(data.parseError)}</div>\` : ''}
            \${latestEntryHtml}
            \${recommendationsHtml}
          </div>\`;
      } catch (err) {
        outBox.innerHTML = '<div class="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono">Diagnostic request failed: ' + escapeHtmlAttr(err.message) + '</div>';
      }
    }

    ${renderDevToolsScript()}

    fetchAll();
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab) switchTab(urlTab);
    setInterval(fetchStats, 10000);
  </script>
</body>
</html>`;
}
