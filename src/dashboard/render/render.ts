import type { AppDeps } from '../../app.js';
import { isOwnerUser, isAdminOrOwner, canUserAccessDashboard } from '../routes/shared.js';
import { renderDevToolsNavItem, renderDevToolsSection, renderDevToolsScript } from '../http/dev-tools.js';

export function renderDashboardHtml(deps: AppDeps, userId: number | null): string {
  if (userId !== null && !canUserAccessDashboard(userId, deps)) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Access Denied · HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-[#0b0f19] text-white min-h-screen flex items-center justify-center font-sans p-4">
  <div class="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 max-w-md text-center shadow-2xl backdrop-blur space-y-4">
    <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xl mb-2">
      <i class="fa-solid fa-lock"></i>
    </div>
    <h1 class="text-xl font-bold">Manage Channels Permission Required</h1>
    <p class="text-sm text-gray-400">
      Access to the HELIX RSS dashboard is restricted to server owners and administrators with the <strong>Manage Channels</strong> permission in Discord.
    </p>
    <div class="pt-2 flex justify-center gap-3">
      <button onclick="logout()" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition border border-gray-700">
        <i class="fa-solid fa-arrow-right-from-bracket mr-1.5"></i> Log Out
      </button>
    </div>
  </div>
  <script>
    async function logout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }
  </script>
</body>
</html>`;
  }

  const isOwner = isOwnerUser(userId, deps);
  const isAdmin = !isOwner && isAdminOrOwner(userId, deps);
  const canAccessSettings = isOwner || isAdmin;
  const isHost = canAccessSettings;
  const dbStats = deps.db.stats();
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
  <script>
    (function() {
      try {
        const saved = localStorage.getItem('helix-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved === 'light' || (!saved && !prefersDark)) {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
      } catch (e) {}
    })();
  </script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-glass: rgba(17, 24, 39, 0.7);
      --border-glass: rgba(55, 65, 81, 0.5);
      --text-main: #f3f4f6;
    }
    html.light-theme {
      --bg-main: #e8ecf2;
      --bg-glass: rgba(248, 250, 252, 0.88);
      --border-glass: rgba(203, 213, 225, 0.9);
      --text-main: #1e293b;
    }
    body { background-color: var(--bg-main); color: var(--text-main); transition: background-color 0.2s ease, color 0.2s ease; }
    .glass { background: var(--bg-glass); backdrop-filter: blur(12px); border: 1px solid var(--border-glass); }
    .glow-cyan { text-shadow: 0 0 12px rgba(6, 182, 212, 0.6); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-main); }
    ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
    .spinner-border { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Light Theme dimmed dual-tone utility mappings */
    html.light-theme ::-webkit-scrollbar-track { background: #e8ecf2; }
    html.light-theme ::-webkit-scrollbar-thumb { background: #94a3b8; }
    html.light-theme ::-webkit-scrollbar-thumb:hover { background: #64748b; }
    html.light-theme .text-white { color: #1e293b !important; }
    html.light-theme .text-gray-400 { color: #475569 !important; }
    html.light-theme .text-gray-300 { color: #334155 !important; }
    html.light-theme .text-gray-500 { color: #64748b !important; }
    html.light-theme .bg-gray-950 { background-color: #dfe4ec !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .bg-gray-900 { background-color: #f8fafc !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .bg-gray-900\\/90 { background-color: rgba(248, 250, 252, 0.95) !important; }
    html.light-theme .bg-gray-800 { background-color: #edf1f7 !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .bg-gray-800\\/80 { background-color: #edf1f7 !important; }
    html.light-theme .border-gray-800 { border-color: #cbd5e1 !important; }
    html.light-theme .border-gray-700 { border-color: #cbd5e1 !important; }
    html.light-theme .bg-black\\/40 { background-color: #e2e8f0 !important; border-color: #cbd5e1 !important; color: #1e293b !important; }
    html.light-theme input, html.light-theme select, html.light-theme textarea { background-color: #ffffff !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme input::placeholder { color: #94a3b8 !important; }
    html.light-theme .tab-btn { color: #64748b; }
    html.light-theme .tab-btn:hover { background-color: #dfe4ec !important; color: #0f172a !important; }
    html.light-theme .tab-btn.text-cyan-300 { color: #0284c7 !important; background-color: rgba(14, 165, 233, 0.15) !important; border-color: rgba(14, 165, 233, 0.4) !important; font-weight: 600; }
    html.light-theme #db-badge { background-color: rgba(14, 165, 233, 0.12) !important; color: #0369a1 !important; border-color: rgba(14, 165, 233, 0.3) !important; }
    html.light-theme #user-pill { background-color: #edf1f7 !important; color: #334155 !important; border-color: #cbd5e1 !important; }
    html.light-theme #theme-toggle-btn { background-color: #edf1f7 !important; color: #334155 !important; border-color: #cbd5e1 !important; }
    html.light-theme #theme-toggle-btn:hover { background-color: #dfe4ec !important; color: #0f172a !important; }
    html.light-theme .shadow-xl, html.light-theme .shadow-2xl { box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04) !important; }
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
        <p class="text-xs text-gray-400">Feed syndication for Discord communities</p>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <button id="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Light/Dark Theme" class="inline-flex items-center justify-center h-8 w-8 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition border border-gray-700">
        <i id="theme-toggle-icon" class="fa-solid fa-moon text-cyan-400"></i>
      </button>
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
        <i class="fa-solid fa-user mr-1.5 text-cyan-400"></i> <span id="user-name">Loading...</span>
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
        <button onclick="switchTab('popular')" id="tab-btn-popular" class="tab-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800/80">
          <i class="fa-solid fa-star w-5"></i> Popular Feeds
        </button>
        ${renderDevToolsNavItem(isHost)}
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
      <div class="pt-3 border-t border-gray-800 text-[11px] text-gray-500 flex justify-between px-1">
        <a href="/privacy" class="hover:text-cyan-400 transition">Privacy</a>
        <span>&middot;</span>
        <a href="/tos" class="hover:text-cyan-400 transition">Terms</a>
        <span>&middot;</span>
        <a href="https://github.com/HELIX-Origin/HELIX-RSS" target="_blank" rel="noreferrer" class="hover:text-cyan-400 transition">GitHub</a>
      </div>
    </nav>

    <!-- Tab Contents -->
    <main class="flex-1 space-y-6 min-w-0">
      <!-- 1. OVERVIEW -->
      <section id="tab-overview" class="tab-content space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <select id="feed-channel" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
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

        <!-- Feed Posting Interval (Per-User Setting) -->
        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <i class="fa-regular fa-clock text-cyan-400"></i> Feed Posting Interval
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">Frequency for checking your feeds and delivering new posts to Discord channels.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">Active interval:</span>
              <span id="user-interval-badge" class="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">1 hour</span>
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1" id="user-interval-buttons">
            <button type="button" onclick="setUserPollInterval(60000)" id="btn-user-60000" class="interval-btn px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
              <i class="fa-solid fa-bolt text-xs text-cyan-400"></i> 1 minute
            </button>
            <button type="button" onclick="setUserPollInterval(600000)" id="btn-user-600000" class="interval-btn px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
              <i class="fa-regular fa-clock text-xs text-cyan-400"></i> 10 minutes
            </button>
            <button type="button" onclick="setUserPollInterval(1800000)" id="btn-user-1800000" class="interval-btn px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
              <i class="fa-regular fa-clock text-xs text-cyan-400"></i> 30 minutes
            </button>
            <button type="button" onclick="setUserPollInterval(3600000)" id="btn-user-3600000" class="interval-btn px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
              <i class="fa-regular fa-clock text-xs text-cyan-400"></i> 1 hour
            </button>
          </div>
        </div>

        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-list text-cyan-400"></i> My Feeds
            </h2>
            <div class="flex items-center gap-2">
              <button onclick="pollAllUserFeeds()" id="btn-poll-all" class="px-3 py-1.5 rounded-lg bg-cyan-700/80 hover:bg-cyan-600 text-xs font-semibold text-white transition flex items-center gap-1.5 border border-cyan-600 shadow-sm">
                <i class="fa-solid fa-bolt"></i> Poll Feeds Now
              </button>
              <button onclick="fetchAll()" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition flex items-center gap-1.5 border border-gray-700">
                <i class="fa-solid fa-rotate-right"></i> Refresh
              </button>
            </div>
          </div>
          <div id="feeds-table-body" class="space-y-2">
            <div class="text-gray-500 py-4 text-center font-mono text-xs">Loading feeds...</div>
          </div>
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
              <input type="text" id="setting-base-url" placeholder="http://localhost:3131" class="w-full bg-black/40 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500">
            </div>
            <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-cyan-400">Feed Posting Interval</span>
                <span id="current-interval-badge" class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">1 hour</span>
              </div>
              <p class="text-xs text-gray-400">Select how frequently the service checks feeds and delivers new posts to Discord.</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1" id="poll-interval-buttons">
                <button type="button" onclick="selectPollInterval(60000)" id="btn-interval-60000" class="interval-btn px-3 py-2 rounded-lg text-xs font-semibold border transition text-center bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
                  <i class="fa-solid fa-bolt text-[10px] mr-1 text-cyan-400"></i>1 min
                </button>
                <button type="button" onclick="selectPollInterval(600000)" id="btn-interval-600000" class="interval-btn px-3 py-2 rounded-lg text-xs font-semibold border transition text-center bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
                  <i class="fa-regular fa-clock text-[10px] mr-1 text-cyan-400"></i>10 min
                </button>
                <button type="button" onclick="selectPollInterval(1800000)" id="btn-interval-1800000" class="interval-btn px-3 py-2 rounded-lg text-xs font-semibold border transition text-center bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
                  <i class="fa-regular fa-clock text-[10px] mr-1 text-cyan-400"></i>30 min
                </button>
                <button type="button" onclick="selectPollInterval(3600000)" id="btn-interval-3600000" class="interval-btn px-3 py-2 rounded-lg text-xs font-semibold border transition text-center bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
                  <i class="fa-regular fa-clock text-[10px] mr-1 text-cyan-400"></i>1 hour
                </button>
              </div>
            </div>
          </div>
          <div class="flex justify-end">
            <button onclick="saveSettings()" class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-sm text-white transition flex items-center gap-2 shadow-lg shadow-cyan-600/20">
              <i class="fa-solid fa-floppy-disk"></i> Save Settings
            </button>
          </div>
        </div>


        <div class="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-users text-cyan-400"></i> Registered Users &amp; Discord App Team
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Team permissions are managed via the Discord Developer Portal. All members of your Discord Application Team automatically have administrative access.
              </p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800"><i class="fa-solid fa-people-group mr-1.5 text-cyan-400"></i>Discord App Team</span>
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
                Scan all member feeds across the system to detect unlinked channels, disabled endpoints, Cloudflare blocks, and configuration errors.
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
              <div class="text-[10px] uppercase font-semibold text-gray-500">Unlinked Channels</div>
              <div id="diag-missing-channels" class="text-xl font-bold text-red-400 mt-1">-</div>
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
            <p class="text-xs text-gray-400" id="modal-member-subtitle">Inspect configuration and channel delivery</p>
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
          const userEl = document.getElementById('user-name') || document.getElementById('user-email');
          if (userEl) userEl.textContent = data.user.displayName || data.user.username || 'Discord User';
        }
      } catch {}
    }

    let userPollIntervalMs = 3600000;
    const intervalLabels = {
      60000: '1 minute',
      600000: '10 minutes',
      1800000: '30 minutes',
      3600000: '1 hour'
    };

    function updateIntervalButtons(ms) {
      userPollIntervalMs = ms;
      const intervals = [60000, 600000, 1800000, 3600000];
      intervals.forEach(val => {
        const btn = document.getElementById('btn-user-' + val);
        if (btn) {
          if (val === ms) {
            btn.className = 'interval-btn px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 bg-cyan-600 text-white border-cyan-500 shadow-sm';
          } else {
            btn.className = 'interval-btn px-4 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700';
          }
        }
      });
      const badge = document.getElementById('user-interval-badge');
      if (badge && intervalLabels[ms]) {
        badge.textContent = intervalLabels[ms];
      }
    }

    async function setUserPollInterval(ms) {
      updateIntervalButtons(ms);
      try {
        const res = await fetch('/api/feeds/interval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pollIntervalMs: ms })
        });
        if (checkAuthError(res)) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Failed to update posting interval');
        }
      } catch (err) {
        alert('Failed to update interval: ' + (err && err.message ? err.message : String(err)));
      }
    }

    async function fetchUserPollInterval() {
      try {
        const res = await fetch('/api/feeds/interval');
        if (res.status === 401 || res.status === 403) return;
        const data = await res.json();
        if (data.pollIntervalMs) {
          updateIntervalButtons(data.pollIntervalMs);
        }
      } catch {}
    }

    function initTheme() {
      const isLight = document.documentElement.classList.contains('light-theme');
      updateThemeIcon(isLight);
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem('helix-theme')) {
            if (e.matches) {
              document.documentElement.classList.remove('light-theme');
              updateThemeIcon(false);
            } else {
              document.documentElement.classList.add('light-theme');
              updateThemeIcon(true);
            }
          }
        });
      } catch {}
    }

    function toggleTheme() {
      const isLight = document.documentElement.classList.toggle('light-theme');
      try {
        localStorage.setItem('helix-theme', isLight ? 'light' : 'dark');
      } catch {}
      updateThemeIcon(isLight);
    }

    function updateThemeIcon(isLight) {
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) {
        icon.className = isLight ? 'fa-solid fa-sun text-amber-500' : 'fa-solid fa-moon text-cyan-400';
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
      const feedsSel = document.getElementById('feed-channel');
      if (feedsSel) feedsSel.innerHTML = buildChannelOptionsHtml(feedsSel.value);
      refreshPresetChannelOptions();
    }

    function refreshPresetChannelOptions() {
      document.querySelectorAll('select[data-preset-channel]').forEach(sel => {
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
                  <select data-preset-channel class="w-48 bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500">
                    <option value="">-- Select Discord channel --</option>
                  </select>
                  <button onclick="enablePreset('\${p.id}', this)" \${p.alreadyAdded ? 'disabled' : ''} class="px-3 py-2 rounded-lg \${p.alreadyAdded ? 'bg-green-950/60 text-green-400 border border-green-800 cursor-default' : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/40'} text-xs font-semibold transition"><i class="fa-solid \${p.alreadyAdded ? 'fa-check' : 'fa-bolt'} mr-1"></i>\${p.alreadyAdded ? 'Added' : 'Enable'}</button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`).join('');

      refreshPresetChannelOptions();
    }

    async function enablePreset(presetId, btn) {
      const preset = presetsCache.find(p => p.id === presetId);
      if (!preset) return;
      const row = btn.closest('.flex');
      const sel = row ? row.querySelector('select[data-preset-channel]') : null;
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
            <div class="text-[10px] text-gray-500">Delivery: \${f.channelId ? \`Discord Channel (<#\${escapeHtmlAttr(f.channelId)}>)\` : 'Not linked'} · Last checked: \${f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never'}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="toggleFeed(\${f.id}, \${f.enabled ? 'false' : 'true'})" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition border border-gray-700"><i class="fa-solid \${f.enabled ? 'fa-pause' : 'fa-play'} mr-1"></i>\${f.enabled ? 'Pause' : 'Resume'}</button>
            <button onclick="pollFeed(\${f.id})" title="Poll now" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition border border-gray-700"><i class="fa-solid fa-rotate"></i></button>
            <button onclick="deleteItem('feeds', \${f.id}, 'feed')" class="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-xs border border-red-800 transition"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      \`).join('');
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

    let selectedPollIntervalMs = 3600000;

    function selectPollInterval(ms) {
      selectedPollIntervalMs = ms;
      const intervals = [60000, 600000, 1800000, 3600000];
      const labels = {
        60000: '1 minute',
        600000: '10 minutes',
        1800000: '30 minutes',
        3600000: '1 hour'
      };
      intervals.forEach(val => {
        const btn = document.getElementById('btn-interval-' + val);
        if (btn) {
          if (val === ms) {
            btn.className = 'interval-btn px-3 py-2 rounded-lg text-xs font-semibold border transition text-center bg-cyan-600 text-white border-cyan-500 shadow-sm';
          } else {
            btn.className = 'interval-btn px-3 py-2 rounded-lg text-xs font-semibold border transition text-center bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700';
          }
        }
      });
      const badge = document.getElementById('current-interval-badge');
      if (badge && labels[ms]) {
        badge.textContent = labels[ms];
      }
    }

    async function fetchSettings() {
      const baseUrlInput = document.getElementById('setting-base-url');
      if (!baseUrlInput) return;
      try {
        const res = await fetch('/api/settings');
        if (res.status === 401 || res.status === 403) return;
        const data = await res.json();
        baseUrlInput.value = data.publicBaseUrl || '';
        if (data.pollIntervalMs) {
          selectPollInterval(data.pollIntervalMs);
        }
        (data.oauthProviders || []).forEach(p => {
          // Credentials intentionally not echoed back; only show enabled state
          const enabledEl = document.getElementById('cfg-' + p.provider + '-enabled');
          if (enabledEl) enabledEl.checked = p.enabled;
        });
      } catch {}
    }



    async function fetchAll() {
      const tasks = [fetchMe(), fetchStats(), fetchFeeds(), fetchDiscordChannels(), fetchPresets(), fetchUserPollInterval()];
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
      const destination = document.getElementById('feed-channel').value;
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

    async function toggleFeed(id, enabled) {
      const res = await fetch('/api/feeds/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      if (checkAuthError(res)) return;
      fetchAll();
    }

    async function pollFeed(id) {
      const res = await fetch('/api/feeds/' + id + '/poll', { method: 'POST' });
      if (checkAuthError(res)) return;
      fetchAll();
    }

    async function pollAllUserFeeds() {
      const btn = document.getElementById('btn-poll-all');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Polling...';
      }
      try {
        const res = await fetch('/api/feeds/poll-all', { method: 'POST' });
        if (checkAuthError(res)) return;
        const data = await res.json();
        if (res.ok) {
          alert('Polled ' + (data.count !== undefined ? data.count : 'all') + ' feed(s) successfully.');
          fetchAll();
        } else {
          alert(data.error || 'Failed to poll feeds');
        }
      } catch (err) {
        alert('Failed to poll feeds: ' + (err && err.message ? err.message : String(err)));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-bolt mr-1.5"></i>Poll Feeds Now';
        }
      }
    }

    async function deleteItem(collection, id, label) {
      if (!confirm('Delete this ' + label + '?')) return;
      const res = await fetch('/api/' + collection + '/' + id, { method: 'DELETE' });
      if (checkAuthError(res)) return;
      fetchAll();
    }



    async function saveSettings() {
      const publicBaseUrl = document.getElementById('setting-base-url').value.trim();
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicBaseUrl, pollIntervalMs: selectedPollIntervalMs })
      });
      if (checkAuthError(res)) return;
      if (res.ok) {
        alert('Settings saved.');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to save settings.');
      }
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
          const isTeamMember = u.role === 'owner' || u.role === 'admin';
          const roleBadge = isTeamMember
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-crown text-amber-400"></i> App Team</span>'
            : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400 border border-gray-700 flex items-center gap-1 shrink-0"><i class="fa-solid fa-user text-gray-400"></i> Member</span>';

          const healthBadge = (u.feedsWithIssuesCount > 0)
            ? \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-triangle-exclamation text-amber-400"></i> \${u.feedsWithIssuesCount} issue\${u.feedsWithIssuesCount === 1 ? '' : 's'}</span>\`
            : (u.feedCount > 0)
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800 flex items-center gap-1 shrink-0"><i class="fa-solid fa-circle-check text-emerald-400"></i> Healthy</span>'
            : '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-500 border border-gray-700 flex items-center gap-1 shrink-0">No feeds</span>';

          const safeUserName = escapeHtmlAttr(u.displayName || 'Discord User').replace(/'/g, "\\\\'");

          return \`
            <div class="p-4 rounded-xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-gray-700 transition">
              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-white text-sm">\${escapeHtmlAttr(u.displayName || 'Discord User')}</span>
                  \${roleBadge}
                  \${healthBadge}
                </div>
                <div class="text-[10px] text-gray-500 font-mono">User ID: #\${u.id} · Feeds: \${u.feedCount} · Joined: \${new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
              <div class="flex items-center gap-2 flex-wrap shrink-0">
                <button onclick="inspectUserFeeds(\${u.id}, '\${safeUserName}')" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-cyan-950/80 text-cyan-300 hover:text-cyan-200 text-xs border border-gray-700 hover:border-cyan-700 transition font-semibold flex items-center gap-1.5 shrink-0">
                  <i class="fa-solid fa-stethoscope text-cyan-400"></i> Inspect Feeds
                </button>
              </div>
            </div>\`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="text-red-400 py-4 text-center font-mono text-xs">Failed to load users.</div>';
      }
    }

    async function inspectUserFeeds(userId, userName) {
      const modal = document.getElementById('member-feeds-modal');
      const title = document.getElementById('modal-member-title');
      const subtitle = document.getElementById('modal-member-subtitle');
      const body = document.getElementById('modal-member-body');
      if (!modal || !body) return;

      title.textContent = 'Member Feeds: ' + userName;
      subtitle.textContent = 'User #' + userId + ' · Feeds and channel delivery diagnostics';
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

          const channelBadge = !f.channelId
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 flex items-center gap-1"><i class="fa-solid fa-link-slash"></i> No Channel</span>'
            : \`<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1"><i class="fa-solid fa-link"></i> \${escapeHtmlAttr(f.channelName || '#' + f.channelId)}</span>\`;

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
                  \${channelBadge}
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
        const missingChannelsEl = document.getElementById('diag-missing-channels') || document.getElementById('diag-missing-webhooks');
        const healthyEl = document.getElementById('diag-healthy-count');

        if (totalEl) totalEl.textContent = data.totalFeeds;
        if (issuesEl) issuesEl.textContent = data.issuesCount;
        if (missingChannelsEl) missingChannelsEl.textContent = data.stats?.missingChannelCount ?? data.stats?.missingWebhookCount ?? 0;
        if (healthyEl) healthyEl.textContent = data.healthyFeedsCount;

        const selectEl = document.getElementById('diag-test-feed-select');
        if (selectEl && data.allFeeds) {
          selectEl.innerHTML = '<option value="">-- Quick select a feed (' + data.allFeeds.length + ' total) --</option>' +
            data.allFeeds.map(f => \`<option value="\${escapeHtmlAttr(f.url)}">\${escapeHtmlAttr(f.name)} (\${escapeHtmlAttr(f.userDisplayName || 'User')})</option>\`).join('');
        }

        const issues = data.feedsWithIssues || [];
        if (!issues.length) {
          issuesBody.innerHTML = \`<div class="p-4 rounded-xl bg-green-950/40 border border-green-800/80 text-green-300 text-xs flex items-center gap-2.5 font-mono"><i class="fa-solid fa-circle-check text-emerald-400 text-base shrink-0"></i><span>All \${data.totalFeeds} member feeds across the system are configured correctly with active channels.</span></div>\`;
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
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800"><i class="fa-solid fa-user mr-1 text-[9px]"></i>\${escapeHtmlAttr(item.userDisplayName || 'Member')}</span>
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

    initTheme();
    fetchAll();
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab) switchTab(urlTab);
    setInterval(fetchStats, 10000);
  </script>
</body>
</html>`;
}
