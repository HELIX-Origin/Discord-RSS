import type { AppDeps } from '../../app.js';
import { isOwnerUser, isAdminOrOwner, canUserAccessDashboard } from '../routes/shared.js';

export function renderDashboardHtml(deps: AppDeps, userId: number | null): string {
  const appName = deps.bot?.getAppName() || 'HELIX RSS';
  const appIconUrl = deps.bot?.getAppIconUrl() || null;

  // Permission check for logged in Discord users without server manage permissions
  if (userId !== null && !canUserAccessDashboard(userId, deps)) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied · ${appName}</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b0f19; color: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 1.25rem; padding: 2rem; max-width: 440px; text-align: center; }
    .icon { display: inline-flex; width: 3.5rem; height: 3.5rem; align-items: center; justify-content: center; border-radius: 1rem; background: rgba(245,158,11,0.1); color: #f59e0b; font-size: 1.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #9ca3af; line-height: 1.5; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 0.75rem; background: #1f2937; color: #d1d5db; font-size: 0.875rem; font-weight: 600; text-decoration: none; border: 1px solid #374151; cursor: pointer; }
    .btn:hover { background: #374151; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><i class="fa-solid fa-lock"></i></div>
    <h1>Manage Channels Required</h1>
    <p>Access to the dashboard is restricted to Discord server owners and administrators with <strong>Manage Channels</strong> permission.</p>
    <button onclick="logout()" class="btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</button>
  </div>
  <script>
    async function logout() {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
      window.location.href = '/login';
    }
  </script>
</body>
</html>`;
  }

  const isOwner = isOwnerUser(userId, deps);
  const isAdmin = !isOwner && isAdminOrOwner(userId, deps);
  const isHost = isOwner || isAdmin;
  const dbStats = deps.db.stats();
  const botInviteUrl = deps.config.clientId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(deps.config.clientId)}&scope=bot%20applications.commands&permissions=534723950656`
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} · Feed Syndication</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(17, 24, 39, 0.85);
      --card-inner: #111827;
      --border: #1f2937;
      --border-hover: #374151;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --primary: #06b6d4;
      --primary-hover: #0891b2;
      --primary-bg: rgba(6, 182, 212, 0.12);
      --primary-border: rgba(6, 182, 212, 0.35);
      --discord: #5865F2;
      --discord-hover: #4752C4;
      --amber: #f59e0b;
      --emerald: #10b981;
      --red: #ef4444;
    }
    html.light {
      --bg: #e8ecf2;
      --card-bg: rgba(248, 250, 252, 0.95);
      --card-inner: #ffffff;
      --border: #cbd5e1;
      --border-hover: #94a3b8;
      --text: #1e293b;
      --text-muted: #475569;
      --text-dim: #64748b;
      --primary: #0284c7;
      --primary-hover: #0369a1;
      --primary-bg: rgba(14, 165, 233, 0.12);
      --primary-border: rgba(14, 165, 233, 0.35);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; transition: background-color 0.2s, color 0.2s; }
    
    /* Header */
    header { position: sticky; top: 0; z-index: 50; background: var(--card-bg); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text); }
    .brand-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: linear-gradient(135deg, #06b6d4, #3b82f6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(6,182,212,0.3); }
    .brand-title { font-size: 1.125rem; font-weight: 800; letter-spacing: -0.02em; }
    .brand-title span { color: var(--primary); }
    .brand-sub { font-size: 0.75rem; color: var(--text-muted); }
    .nav-actions { display: flex; align-items: center; gap: 0.625rem; }

    /* Layout */
    .container { max-width: 1280px; width: 100%; margin: 0 auto; padding: 1.5rem; flex: 1; display: flex; gap: 1.5rem; }
    @media (max-width: 860px) { .container { flex-direction: column; } }

    /* Sidebar Navigation */
    nav.sidebar { width: 240px; flex-shrink: 0; background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; height: calc(100vh - 6.5rem); position: sticky; top: 5rem; }
    @media (max-width: 860px) { nav.sidebar { width: 100%; height: auto; position: static; } }
    .tab-list { display: flex; flex-direction: column; gap: 0.375rem; }
    .tab-btn { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); background: transparent; border: 1px solid transparent; cursor: pointer; text-align: left; transition: all 0.15s; }
    .tab-btn:hover { background: rgba(255,255,255,0.05); color: var(--text); }
    .tab-btn.active { color: var(--primary); background: var(--primary-bg); border-color: var(--primary-border); }
    .sidebar-footer { padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-dim); display: flex; justify-content: space-between; }
    .sidebar-footer a { color: var(--text-muted); text-decoration: none; }
    .sidebar-footer a:hover { color: var(--primary); }

    /* Main Content */
    main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1.5rem; }
    .tab-pane { display: none; flex-direction: column; gap: 1.5rem; }
    .tab-pane.active { display: flex; }

    /* Cards & Components */
    .card { background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 1rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 0.5rem; }
    .card-desc { font-size: 0.8125rem; color: var(--text-muted); }

    /* Grid layout */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .stat-card { background: var(--card-inner); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; }
    .stat-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .stat-value { font-size: 1.875rem; font-weight: 800; color: var(--primary); margin-top: 0.5rem; }
    .stat-sub { font-size: 0.75rem; color: var(--text-dim); margin-top: 0.25rem; }

    /* Form Controls */
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    input[type="text"], select, textarea { width: 100%; background: var(--card-inner); border: 1px solid var(--border); border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--text); outline: none; transition: border-color 0.15s; }
    input[type="text"]:focus, select:focus { border-color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: all 0.15s; }
    .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(6,182,212,0.25); }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-discord { background: var(--discord); color: #fff; }
    .btn-discord:hover { background: var(--discord-hover); }
    .btn-ghost { background: var(--card-inner); color: var(--text-muted); border-color: var(--border); }
    .btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--text); }
    .btn-danger { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }
    .btn-danger:hover { background: rgba(239,68,68,0.3); color: #fff; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: 0.5rem; }

    /* Feed & List Items */
    .feed-item { background: var(--card-inner); border: 1px solid var(--border); border-radius: 1rem; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .feed-details { min-width: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .feed-name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .feed-name { font-weight: 700; font-size: 0.9375rem; color: var(--text); }
    .feed-url { font-size: 0.75rem; color: var(--text-dim); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 480px; }
    .feed-meta { font-size: 0.6875rem; color: var(--text-dim); }
    .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; }
    .badge-green { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .badge-gray { background: rgba(156,163,175,0.12); color: #9ca3af; border: 1px solid var(--border); }
    .badge-amber { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }

    /* Interval Pills */
    .interval-group { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .interval-btn { padding: 0.5rem 1rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 600; background: var(--card-inner); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
    .interval-btn:hover { background: rgba(255,255,255,0.05); color: var(--text); }
    .interval-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }

    .empty-state { padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <a href="/dashboard" class="brand">
      ${
        appIconUrl
          ? `<img src="${appIconUrl}" alt="${appName}" style="width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`
          : `<div class="brand-icon"><i class="fa-solid fa-rss"></i></div>`
      }
      <div>
        <div class="brand-title">${appName}</div>
        <div class="brand-sub">Discord Feed Syndication</div>
      </div>
    </a>

    <div class="nav-actions">
      <button onclick="toggleTheme()" class="btn btn-ghost btn-sm" title="Toggle Theme">
        <i id="theme-icon" class="fa-solid fa-moon"></i>
      </button>
      ${
        botInviteUrl
          ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-discord btn-sm">
        <i class="fa-brands fa-discord"></i> Invite Bot
      </a>`
          : ''
      }
      ${
        userId !== null
          ? `<span class="badge badge-gray" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;">
        <i class="fa-solid fa-user" style="color: var(--primary); margin-right: 0.25rem;"></i> <span id="user-display-name">Discord User</span>
      </span>
      <button onclick="logout()" class="btn btn-ghost btn-sm" title="Log Out"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>`
          : `<a href="/api/auth/discord" class="btn btn-discord btn-sm"><i class="fa-brands fa-discord"></i> Log In with Discord</a>`
      }
    </div>
  </header>

  <!-- Container -->
  <div class="container">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="tab-list">
        <button onclick="switchTab('overview')" id="tab-btn-overview" class="tab-btn active">
          <i class="fa-solid fa-chart-line"></i> Overview
        </button>
        <button onclick="switchTab('feeds')" id="tab-btn-feeds" class="tab-btn">
          <i class="fa-solid fa-list"></i> Feeds
        </button>
        <button onclick="switchTab('reddit')" id="tab-btn-reddit" class="tab-btn">
          <i class="fa-brands fa-reddit" style="color: #ff4500;"></i> Reddit Image Feeds
        </button>
        <button onclick="switchTab('popular')" id="tab-btn-popular" class="tab-btn">
          <i class="fa-solid fa-star"></i> Popular Feeds
        </button>
        ${
          isHost
            ? `<button onclick="switchTab('settings')" id="tab-btn-settings" class="tab-btn">
          <i class="fa-solid fa-sliders"></i> Settings
        </button>`
            : ''
        }
      </div>

      <div class="sidebar-footer">
        <a href="/privacy">Privacy</a>
        <span>&middot;</span>
        <a href="/tos">Terms</a>
        <span>&middot;</span>
        <a href="${deps.config.repoUrl || 'https://github.com/HELIX-Origin/HELIX-RSS'}" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </nav>

    <!-- Main View -->
    <main>
      <!-- TAB 1: OVERVIEW -->
      <section id="tab-overview" class="tab-pane active">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">My Subscriptions</div>
            <div class="stat-value" id="stat-feeds-count">0</div>
            <div class="stat-sub">Active feed syndications</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Discord Delivery</div>
            <div class="stat-value" style="color: #5865F2;" id="stat-channels-count">0</div>
            <div class="stat-sub">Connected channels</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Database Engine</div>
            <div class="stat-value" style="color: #10b981;">${Math.round(dbStats.dbSizeBytes / 1024)} KB</div>
            <div class="stat-sub">SQLite synchronous engine</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fa-solid fa-clock-rotate-left" style="color: var(--primary);"></i> Recent Activity</div>
              <div class="card-desc">System logs, delivery notifications, and parser status</div>
            </div>
            <button onclick="loadOverviewTab()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
          </div>
          <div id="activity-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 320px; overflow-y: auto;">
            <div class="empty-state">Loading recent activity...</div>
          </div>
        </div>
      </section>

      <!-- TAB 2: FEEDS -->
      <section id="tab-feeds" class="tab-pane">
        <!-- Add Feed Card -->
        <div class="card">
          <div>
            <div class="card-title"><i class="fa-solid fa-plus-circle" style="color: var(--primary);"></i> Add New RSS Feed</div>
            <div class="card-desc">Provide any RSS, Atom, or XML feed URL and select the destination Discord channel.</div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Feed Name</label>
              <input type="text" id="add-feed-name" placeholder="E.g., TechCrunch News">
            </div>
            <div class="form-group">
              <label class="form-label">Feed URL</label>
              <input type="text" id="add-feed-url" placeholder="https://example.com/rss.xml" style="font-family: monospace;">
            </div>
            <div class="form-group">
              <label class="form-label">Destination Discord Channel</label>
              <select id="add-feed-channel">
                <option value="">-- Select Discord Channel --</option>
              </select>
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button onclick="submitAddFeed()" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Add Feed</button>
          </div>
        </div>

        <!-- Feed Posting Interval Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fa-regular fa-clock" style="color: var(--primary);"></i> Feed Posting Interval</div>
              <div class="card-desc">How often the system checks feeds for new articles and delivers them to your Discord channels.</div>
            </div>
            <span class="badge badge-green" id="active-interval-badge">1 hour</span>
          </div>
          <div class="interval-group" id="interval-buttons-container">
            <button type="button" onclick="setUserInterval(60000)" id="int-btn-60000" class="interval-btn"><i class="fa-solid fa-bolt"></i> 1 minute</button>
            <button type="button" onclick="setUserInterval(600000)" id="int-btn-600000" class="interval-btn"><i class="fa-regular fa-clock"></i> 10 minutes</button>
            <button type="button" onclick="setUserInterval(1800000)" id="int-btn-1800000" class="interval-btn"><i class="fa-regular fa-clock"></i> 30 minutes</button>
            <button type="button" onclick="setUserInterval(3600000)" id="int-btn-3600000" class="interval-btn active"><i class="fa-regular fa-clock"></i> 1 hour</button>
          </div>
        </div>

        <!-- My Feeds List Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fa-solid fa-list" style="color: var(--primary);"></i> My Subscribed Feeds</div>
              <div class="card-desc">Manage, pause, poll, or remove your active feed syndications.</div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button onclick="pollAllFeeds()" class="btn btn-primary btn-sm"><i class="fa-solid fa-bolt"></i> Poll Feeds Now</button>
              <button onclick="loadFeedsTab()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
            </div>
          </div>
          <div id="feeds-list-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="empty-state">Loading feeds...</div>
          </div>
        </div>
      </section>

      <!-- TAB 3: REDDIT IMAGE FEEDS -->
      <section id="tab-reddit" class="tab-pane">
        <!-- Add Reddit Feed Card -->
        <div class="card" style="border-left: 4px solid #ff4500;">
          <div>
            <div class="card-title" style="color: #ff4500;"><i class="fa-brands fa-reddit" style="font-size: 1.25rem;"></i> Custom Reddit Image Feeds</div>
            <div class="card-desc">Clean image feeds built specifically for Reddit. Delivers post titles and full-width high-resolution images while stripping out comment text and message bodies.</div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Subreddit or Reddit RSS URL</label>
              <input type="text" id="add-reddit-sub" placeholder="e.g. wallpapers, r/EarthPorn, or https://www.reddit.com/r/art/.rss" oninput="handleRedditSubInput(this.value)">
            </div>
            <div class="form-group">
              <label class="form-label">Custom Display Name</label>
              <input type="text" id="add-reddit-name" placeholder="Leave empty for auto (e.g. Reddit · r/wallpapers)">
            </div>
            <div class="form-group">
              <label class="form-label">Destination Discord Channel</label>
              <select id="add-reddit-channel">
                <option value="">-- Select Discord Channel --</option>
              </select>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.25rem;">
            <div style="display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-dim); margin-right: 0.25rem;">Filter:</span>
              <button type="button" onclick="setRedditSort('hot')" id="reddit-sort-hot" class="btn btn-ghost btn-sm active" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">Hot</button>
              <button type="button" onclick="setRedditSort('top-day')" id="reddit-sort-top-day" class="btn btn-ghost btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">Top (Day)</button>
              <button type="button" onclick="setRedditSort('top-week')" id="reddit-sort-top-week" class="btn btn-ghost btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">Top (Week)</button>
              <button type="button" onclick="setRedditSort('new')" id="reddit-sort-new" class="btn btn-ghost btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">New</button>
            </div>
            <button onclick="submitAddRedditFeed()" class="btn btn-primary" style="background: #ff4500; border-color: #ff4500; box-shadow: 0 4px 12px rgba(255,69,0,0.25);">
              <i class="fa-brands fa-reddit"></i> Add Reddit Image Feed
            </button>
          </div>
        </div>

        <!-- Curated Popular Reddit Image Feeds -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fa-solid fa-camera-retro" style="color: #ff4500;"></i> Popular Image Subreddits</div>
              <div class="card-desc">Curated high-resolution photography, wallpapers, art, and meme feeds ready to sync in one click.</div>
            </div>
          </div>
          <div id="reddit-curated-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.875rem;">
            <div class="empty-state">Loading curated subreddits...</div>
          </div>
        </div>

        <!-- Active Reddit Feeds List Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fa-brands fa-reddit" style="color: #ff4500;"></i> My Reddit Image Feeds</div>
              <div class="card-desc">Active image feeds sending image embeds to your Discord server.</div>
            </div>
            <button onclick="loadRedditTab()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
          </div>
          <div id="reddit-feeds-list-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="empty-state">Loading Reddit feeds...</div>
          </div>
        </div>
      </section>

      <!-- TAB 4: POPULAR FEEDS CATALOG -->
      <section id="tab-popular" class="tab-pane">
        <div class="card">
          <div>
            <div class="card-title"><i class="fa-solid fa-star" style="color: var(--amber);"></i> Popular Feeds Catalog</div>
            <div class="card-desc">One-click subscribe to top news, tech, science, gaming, and developer feeds directly into any Discord channel.</div>
          </div>
          <div id="presets-list-container" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="empty-state">Loading popular feeds catalog...</div>
          </div>
        </div>
      </section>

      <!-- TAB 4: SETTINGS (ADMIN ONLY) -->
      ${
        isHost
          ? `<section id="tab-settings" class="tab-pane">
        <div class="card">
          <div>
            <div class="card-title"><i class="fa-solid fa-sliders" style="color: var(--primary);"></i> System Settings</div>
            <div class="card-desc">Configure public endpoints, OAuth redirection, and service defaults.</div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Public Base URL</label>
              <input type="text" id="cfg-base-url" placeholder="http://159.223.140.212:3131">
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button onclick="saveSystemSettings()" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title"><i class="fa-solid fa-users" style="color: var(--primary);"></i> Registered Users &amp; Discord App Team</div>
              <div class="card-desc">All Discord Application team members automatically have administrative privileges.</div>
            </div>
            <button onclick="loadUsersList()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
          </div>
          <div id="users-list-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="empty-state">Loading users...</div>
          </div>
        </div>
      </section>`
          : ''
      }
    </main>
  </div>

  <script>
    // Sanitizer
    function esc(s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // State caches
    let cachedChannels = [];
    let cachedPresets = [];
    let activeTabName = 'overview';

    // Tab Switching
    function switchTab(tabId) {
      activeTabName = tabId;
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

      const target = document.getElementById('tab-' + tabId);
      const btn = document.getElementById('tab-btn-' + tabId);
      if (target) target.classList.add('active');
      if (btn) btn.classList.add('active');

      // Lazy-load data when switching to a tab
      if (tabId === 'overview') loadOverviewTab();
      else if (tabId === 'feeds') loadFeedsTab();
      else if (tabId === 'reddit') loadRedditTab();
      else if (tabId === 'popular') loadPopularTab();
      else if (tabId === 'settings') loadSettingsTab();
    }

    // Theme Toggle
    function initTheme() {
      const saved = localStorage.getItem('helix-theme');
      if (saved === 'light') {
        document.documentElement.classList.add('light');
        document.getElementById('theme-icon').className = 'fa-solid fa-sun';
      }
    }
    function toggleTheme() {
      const isLight = document.documentElement.classList.toggle('light');
      localStorage.setItem('helix-theme', isLight ? 'light' : 'dark');
      document.getElementById('theme-icon').className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    // Auth & Logout
    async function logout() {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
      window.location.href = '/login';
    }

    function checkAuth(res) {
      if (res.status === 401) {
        if (confirm('You must be logged in with Discord to perform this action. Go to login page?')) {
          window.location.href = '/login';
        }
        return false;
      }
      return true;
    }

    // User Profile
    async function loadUserProfile() {
      try {
        const res = await fetch('/api/auth/me', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.authenticated && data.user) {
          const el = document.getElementById('user-display-name');
          if (el) el.textContent = data.user.displayName || data.user.username || 'Discord User';
        }
      } catch {}
    }

    // Channels Dropdown Builder
    function buildChannelOptionsHtml(currentVal) {
      if (!cachedChannels || !cachedChannels.length) {
        return '<option value="">-- No Discord Channels Available (Invite Bot) --</option>';
      }
      let html = '<option value="">-- Select Discord Channel --</option>';
      cachedChannels.forEach(g => {
        const channels = g.channels || [];
        if (channels.length) {
          html += '<optgroup label="' + esc(g.name) + '">';
          channels.forEach(ch => {
            const val = 'channel:' + ch.id;
            const sel = (currentVal === val || currentVal === ch.id) ? 'selected' : '';
            html += '<option value="' + val + '" ' + sel + '>#' + esc(ch.name) + '</option>';
          });
          html += '</optgroup>';
        }
      });
      return html;
    }

    async function loadDiscordChannels() {
      try {
        const res = await fetch('/api/discord/channels', { signal: AbortSignal.timeout(6000) });
        if (!res.ok) return;
        const data = await res.json();
        cachedChannels = data.guilds || [];
        
        // Populate Add Feed dropdown
        const sel = document.getElementById('add-feed-channel');
        if (sel) sel.innerHTML = buildChannelOptionsHtml(sel.value);

        // Populate Add Reddit dropdown
        const redditSel = document.getElementById('add-reddit-channel');
        if (redditSel) redditSel.innerHTML = buildChannelOptionsHtml(redditSel.value);

        // Update connected channels count on overview
        const chCountEl = document.getElementById('stat-channels-count');
        if (chCountEl) {
          const total = cachedChannels.reduce((acc, g) => acc + (g.channels?.length || 0), 0);
          chCountEl.textContent = total;
        }

        // Refresh any preset channel selects
        document.querySelectorAll('select[data-preset-channel], select[data-reddit-preset-channel]').forEach(s => {
          s.innerHTML = buildChannelOptionsHtml(s.value);
        });
      } catch {}
    }

    // TAB 1: OVERVIEW
    async function loadOverviewTab() {
      const activityEl = document.getElementById('activity-list');
      const feedsCountEl = document.getElementById('stat-feeds-count');
      try {
        const res = await fetch('/api/stats', { signal: AbortSignal.timeout(5000) });
        if (res.status === 401 || res.status === 403) {
          if (activityEl) activityEl.innerHTML = '<div class="empty-state">Sign in with Discord to view recent activity.</div>';
          if (feedsCountEl) feedsCountEl.textContent = '0';
          return;
        }
        const data = await res.json();
        if (feedsCountEl) feedsCountEl.textContent = data.myFeeds !== undefined ? data.myFeeds : '0';

        if (activityEl && data.activity && data.activity.length) {
          activityEl.innerHTML = data.activity.map(a => {
            const color = a.level === 'error' ? '#ef4444' : a.level === 'warn' ? '#f59e0b' : 'var(--primary)';
            return '<div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 0.75rem; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem;">' +
              '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                '<i class="fa-solid fa-circle" style="color: ' + color + '; font-size: 0.5rem;"></i>' +
                '<span style="color: var(--text);">' + esc(a.message) + '</span>' +
              '</div>' +
              '<span style="font-size: 0.6875rem; color: var(--text-dim); font-family: monospace;">' + esc(a.ts) + '</span>' +
            '</div>';
          }).join('');
        } else if (activityEl) {
          activityEl.innerHTML = '<div class="empty-state">No recent activity recorded yet.</div>';
        }
      } catch {
        if (activityEl) activityEl.innerHTML = '<div class="empty-state">Could not load activity.</div>';
      }
    }

    // TAB 2: FEEDS
    async function loadFeedsTab() {
      const container = document.getElementById('feeds-list-container');
      const feedsCountEl = document.getElementById('stat-feeds-count');
      
      // Also load user interval and channels
      loadUserInterval();
      loadDiscordChannels();

      try {
        const res = await fetch('/api/feeds', { signal: AbortSignal.timeout(5000) });
        if (res.status === 401 || res.status === 403) {
          if (container) container.innerHTML = '<div class="empty-state">Sign in with Discord to view and manage your feeds.</div>';
          return;
        }
        const feeds = await res.json();
        if (!Array.isArray(feeds) || !feeds.length) {
          if (container) container.innerHTML = '<div class="empty-state">No feeds added yet. Add a feed above or enable popular feeds.</div>';
          if (feedsCountEl) feedsCountEl.textContent = '0';
          return;
        }

        if (feedsCountEl) feedsCountEl.textContent = feeds.length;
        if (!container) return;

        container.innerHTML = feeds.map(f => {
          const isReddit = f.feedType === 'reddit' || (f.url && f.url.includes('reddit.com'));
          const typeBadge = isReddit
            ? '<span class="badge" style="background: rgba(255,69,0,0.15); color: #ff4500; border: 1px solid rgba(255,69,0,0.3);"><i class="fa-brands fa-reddit"></i> Reddit Image</span>'
            : f.feedType === 'scrape'
              ? '<span class="badge badge-amber"><i class="fa-solid fa-code"></i> Scraper</span>'
              : '<span class="badge badge-gray"><i class="fa-solid fa-rss"></i> RSS</span>';
          const statusBadge = f.enabled
            ? '<span class="badge badge-green">Active</span>'
            : '<span class="badge badge-gray">Paused</span>';
          const lastPolled = f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never polled';

          return '<div class="feed-item">' +
            '<div class="feed-details">' +
              '<div class="feed-name-row">' +
                '<span class="feed-name">' + esc(f.name) + '</span>' +
                typeBadge +
                statusBadge +
              '</div>' +
              '<div class="feed-url">' + esc(f.url) + '</div>' +
              '<div class="feed-meta">Delivery: ' + (f.channelId ? '<# ' + esc(f.channelId) + '>' : 'Not linked') + ' &middot; Checked: ' + lastPolled + '</div>' +
            '</div>' +
            '<div style="display: flex; gap: 0.375rem; shrink-0;">' +
              '<button onclick="toggleFeed(' + f.id + ', ' + (f.enabled ? 'false' : 'true') + ')" class="btn btn-ghost btn-sm">' +
                '<i class="fa-solid ' + (f.enabled ? 'fa-pause' : 'fa-play') + '"></i> ' + (f.enabled ? 'Pause' : 'Resume') +
              '</button>' +
              '<button onclick="pollSingleFeed(' + f.id + ')" class="btn btn-ghost btn-sm" title="Poll now"><i class="fa-solid fa-rotate"></i></button>' +
              '<button onclick="deleteFeed(' + f.id + ')" class="btn btn-danger btn-sm" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch {
        if (container) container.innerHTML = '<div class="empty-state">Failed to load feeds.</div>';
      }
    }

    async function loadUserInterval() {
      try {
        const res = await fetch('/api/feeds/interval', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.pollIntervalMs) {
          updateIntervalUI(data.pollIntervalMs);
        }
      } catch {}
    }

    function updateIntervalUI(ms) {
      const labels = { 60000: '1 minute', 600000: '10 minutes', 1800000: '30 minutes', 3600000: '1 hour' };
      const badge = document.getElementById('active-interval-badge');
      if (badge && labels[ms]) badge.textContent = labels[ms];

      [60000, 600000, 1800000, 3600000].forEach(val => {
        const btn = document.getElementById('int-btn-' + val);
        if (btn) {
          if (val === ms) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
    }

    async function setUserInterval(ms) {
      updateIntervalUI(ms);
      try {
        const res = await fetch('/api/feeds/interval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pollIntervalMs: ms })
        });
        if (!checkAuth(res)) return;
      } catch {}
    }

    async function submitAddFeed() {
      const nameInput = document.getElementById('add-feed-name');
      const urlInput = document.getElementById('add-feed-url');
      const chanInput = document.getElementById('add-feed-channel');

      const name = nameInput ? nameInput.value.trim() : '';
      const url = urlInput ? urlInput.value.trim() : '';
      const channelVal = chanInput ? chanInput.value : '';

      if (!name || !url) return alert('Please enter both feed name and URL.');

      let channelId = null;
      if (channelVal.startsWith('channel:')) channelId = channelVal.replace('channel:', '');
      else if (/^[0-9]+$/.test(channelVal)) channelId = channelVal;

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url, channelId, feedType: 'rss' })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          if (nameInput) nameInput.value = '';
          if (urlInput) urlInput.value = '';
          loadFeedsTab();
        } else {
          alert(data.error || 'Failed to add feed');
        }
      } catch (err) {
        alert('Network error adding feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    async function toggleFeed(id, enabled) {
      try {
        const res = await fetch('/api/feeds/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        if (!checkAuth(res)) return;
        if (activeTabName === 'reddit') loadRedditTab();
        else loadFeedsTab();
      } catch {}
    }

    async function pollSingleFeed(id) {
      try {
        const res = await fetch('/api/feeds/' + id + '/poll', { method: 'POST' });
        if (!checkAuth(res)) return;
        alert('Feed poll initiated.');
        if (activeTabName === 'reddit') loadRedditTab();
        else loadFeedsTab();
      } catch {}
    }

    async function pollAllFeeds() {
      try {
        const res = await fetch('/api/feeds/poll-all', { method: 'POST' });
        if (!checkAuth(res)) return;
        alert('Polled all feeds successfully.');
        if (activeTabName === 'reddit') loadRedditTab();
        else loadFeedsTab();
      } catch {}
    }

    async function deleteFeed(id) {
      if (!confirm('Are you sure you want to remove this feed?')) return;
      try {
        const res = await fetch('/api/feeds/' + id, { method: 'DELETE' });
        if (!checkAuth(res)) return;
        if (activeTabName === 'reddit') loadRedditTab();
        else loadFeedsTab();
      } catch {}
    }

    // ==================== REDDIT IMAGE FEEDS CONTROLLER ====================
    let currentRedditSort = 'hot';

    const CURATED_REDDIT_SUBS = [
      { sub: 'EarthPorn', name: 'Reddit · r/EarthPorn', desc: 'Breathtaking landscape and wild nature photography', tag: 'Photography' },
      { sub: 'wallpapers', name: 'Reddit · r/wallpapers', desc: 'High-definition digital wallpapers for desktop and mobile', tag: 'Wallpapers' },
      { sub: 'Art', name: 'Reddit · r/Art', desc: 'Original artwork, illustrations, sculptures, and concept art', tag: 'Art' },
      { sub: 'spaceporn', name: 'Reddit · r/spaceporn', desc: 'Deep space telescopes, galaxies, nebulas, and astronomy', tag: 'Space' },
      { sub: 'NatureIsFuckingLit', name: 'Reddit · r/NatureIsFuckingLit', desc: 'Mindblowing wildlife behavior and nature moments', tag: 'Nature' },
      { sub: 'ArchitecturePorn', name: 'Reddit · r/ArchitecturePorn', desc: 'Stunning architectural design, structures, and skylines', tag: 'Design' },
      { sub: 'Aww', name: 'Reddit · r/Aww', desc: 'Adorable animals, cute puppies, kittens, and heartwarming pets', tag: 'Animals' },
      { sub: 'Memes', name: 'Reddit · r/Memes', desc: 'Trending community humor and top viral memes', tag: 'Memes' }
    ];

    function setRedditSort(sort) {
      currentRedditSort = sort;
      ['hot', 'top-day', 'top-week', 'new'].forEach(s => {
        const btn = document.getElementById('reddit-sort-' + s);
        if (btn) {
          if (s === sort) {
            btn.style.background = '#ff4500';
            btn.style.color = '#ffffff';
            btn.style.borderColor = '#ff4500';
          } else {
            btn.style.background = 'var(--card-inner)';
            btn.style.color = 'var(--text-muted)';
            btn.style.borderColor = 'var(--border)';
          }
        }
      });
    }

    function cleanSubredditName(raw) {
      let s = (raw || '').trim();
      if (s.includes('reddit.com/r/')) s = s.split('reddit.com/r/')[1];
      else if (s.includes('reddit.com/user/')) s = s.split('reddit.com/user/')[1];
      s = s.split('?')[0].split('#')[0].split('/')[0].split('.')[0];
      if (s.startsWith('r/')) s = s.slice(2);
      if (s.startsWith('u/')) s = s.slice(2);
      return s.trim();
    }

    function handleRedditSubInput(val) {
      const nameInput = document.getElementById('add-reddit-name');
      if (!nameInput) return;
      const clean = cleanSubredditName(val);
      if (clean && (!nameInput.value || nameInput.value.startsWith('Reddit · r/'))) {
        nameInput.placeholder = 'Reddit · r/' + clean;
      }
    }

    function buildRedditUrl(rawInput, sort) {
      const trimmed = (rawInput || '').trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        if (trimmed.includes('reddit.com')) {
          if (trimmed.includes('.rss')) return trimmed;
          const noTrailing = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
          return noTrailing + '/.rss';
        }
        return trimmed;
      }

      const clean = cleanSubredditName(trimmed);
      if (trimmed.startsWith('u/') || trimmed.startsWith('user/')) {
        return 'https://www.reddit.com/user/' + clean + '/.rss';
      }

      if (sort === 'top-day') return 'https://www.reddit.com/r/' + clean + '/top/.rss?t=day';
      if (sort === 'top-week') return 'https://www.reddit.com/r/' + clean + '/top/.rss?t=week';
      if (sort === 'new') return 'https://www.reddit.com/r/' + clean + '/new/.rss';
      return 'https://www.reddit.com/r/' + clean + '/.rss';
    }

    async function loadRedditTab() {
      loadDiscordChannels();
      setRedditSort(currentRedditSort);

      // 1. Render Curated Subreddits Grid
      const curatedContainer = document.getElementById('reddit-curated-container');
      if (curatedContainer) {
        curatedContainer.innerHTML = CURATED_REDDIT_SUBS.map(item => {
          return '<div style="background: var(--card-inner); border: 1px solid var(--border); border-radius: 1rem; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">' +
            '<div style="display: flex; flex-direction: column; gap: 0.25rem;">' +
              '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<span style="font-weight: 700; font-size: 0.9375rem; color: #ff4500; display: flex; align-items: center; gap: 0.375rem;"><i class="fa-brands fa-reddit"></i> r/' + esc(item.sub) + '</span>' +
                '<span class="badge badge-gray">' + esc(item.tag) + '</span>' +
              '</div>' +
              '<div style="font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4;">' + esc(item.desc) + '</div>' +
            '</div>' +
            '<div style="display: flex; gap: 0.5rem; align-items: center;">' +
              '<select data-reddit-preset-channel style="font-size: 0.75rem; padding: 0.4rem 0.6rem; flex: 1;">' +
                buildChannelOptionsHtml('') +
              '</select>' +
              '<button onclick="enableRedditPreset(\\'' + esc(item.sub) + '\\', \\'' + esc(item.name) + '\\', this)" class="btn btn-sm" style="background: #ff4500; color: #fff; white-space: nowrap;">' +
                '<i class="fa-solid fa-plus"></i> Add' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      // 2. Load User's Reddit Feeds
      const feedsContainer = document.getElementById('reddit-feeds-list-container');
      try {
        const res = await fetch('/api/feeds', { signal: AbortSignal.timeout(5000) });
        if (res.status === 401 || res.status === 403) {
          if (feedsContainer) feedsContainer.innerHTML = '<div class="empty-state">Sign in with Discord to view and manage your Reddit image feeds.</div>';
          return;
        }
        const feeds = await res.json();
        const redditFeeds = Array.isArray(feeds) ? feeds.filter(f => f.feedType === 'reddit' || (f.url && f.url.includes('reddit.com'))) : [];

        if (!redditFeeds.length) {
          if (feedsContainer) feedsContainer.innerHTML = '<div class="empty-state">No Reddit image feeds added yet. Add a custom subreddit above or choose from the popular ones!</div>';
          return;
        }

        if (feedsContainer) {
          feedsContainer.innerHTML = redditFeeds.map(f => {
            const statusBadge = f.enabled
              ? '<span class="badge badge-green">Active</span>'
              : '<span class="badge badge-gray">Paused</span>';
            const lastPolled = f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never polled';

            return '<div class="feed-item" style="border-left: 3px solid #ff4500;">' +
              '<div class="feed-details">' +
                '<div class="feed-name-row">' +
                  '<span class="feed-name" style="color: #ff4500;"><i class="fa-brands fa-reddit"></i> ' + esc(f.name) + '</span>' +
                  '<span class="badge" style="background: rgba(255,69,0,0.15); color: #ff4500; border: 1px solid rgba(255,69,0,0.3);">Image Only</span>' +
                  statusBadge +
                '</div>' +
                '<div class="feed-url">' + esc(f.url) + '</div>' +
                '<div class="feed-meta">Channel: ' + (f.channelId ? '<# ' + esc(f.channelId) + '>' : 'Not linked') + ' &middot; Checked: ' + lastPolled + '</div>' +
              '</div>' +
              '<div style="display: flex; gap: 0.375rem; shrink-0;">' +
                '<button onclick="toggleFeed(' + f.id + ', ' + (f.enabled ? 'false' : 'true') + ')" class="btn btn-ghost btn-sm">' +
                  '<i class="fa-solid ' + (f.enabled ? 'fa-pause' : 'fa-play') + '"></i> ' + (f.enabled ? 'Pause' : 'Resume') +
                '</button>' +
                '<button onclick="pollSingleFeed(' + f.id + ')" class="btn btn-ghost btn-sm" title="Poll now"><i class="fa-solid fa-rotate"></i></button>' +
                '<button onclick="deleteFeed(' + f.id + ')" class="btn btn-danger btn-sm" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
              '</div>' +
            '</div>';
          }).join('');
        }
      } catch {
        if (feedsContainer) feedsContainer.innerHTML = '<div class="empty-state">Failed to load Reddit feeds.</div>';
      }
    }

    async function submitAddRedditFeed() {
      const subInput = document.getElementById('add-reddit-sub');
      const nameInput = document.getElementById('add-reddit-name');
      const chanInput = document.getElementById('add-reddit-channel');

      const rawSub = subInput ? subInput.value.trim() : '';
      if (!rawSub) return alert('Please enter a subreddit name or Reddit RSS URL (e.g. wallpapers or r/EarthPorn).');

      const url = buildRedditUrl(rawSub, currentRedditSort);
      let name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        const cleanSub = cleanSubredditName(rawSub);
        name = 'Reddit · r/' + cleanSub;
      }

      const channelVal = chanInput ? chanInput.value : '';
      let channelId = null;
      if (channelVal.startsWith('channel:')) channelId = channelVal.replace('channel:', '');
      else if (/^[0-9]+$/.test(channelVal)) channelId = channelVal;

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url, channelId, feedType: 'reddit' })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          if (subInput) subInput.value = '';
          if (nameInput) nameInput.value = '';
          loadRedditTab();
        } else {
          alert(data.error || 'Failed to add Reddit feed');
        }
      } catch (err) {
        alert('Network error adding Reddit feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    async function enableRedditPreset(sub, defaultName, btn) {
      const row = btn.closest('div');
      const sel = row ? row.querySelector('select[data-reddit-preset-channel]') : null;
      const rawVal = sel ? sel.value : '';

      if (!rawVal) {
        return alert('Please select a destination Discord channel for "r/' + sub + '".');
      }

      let channelId = null;
      if (rawVal.startsWith('channel:')) channelId = rawVal.replace('channel:', '');
      else if (/^[0-9]+$/.test(rawVal)) channelId = rawVal;

      const url = 'https://www.reddit.com/r/' + sub + '/.rss';

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: defaultName, url, channelId, feedType: 'reddit' })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          alert('Enabled Reddit Image Feed for "r/' + sub + '".');
          loadRedditTab();
        } else {
          alert(data.error || 'Failed to enable Reddit feed');
        }
      } catch (err) {
        alert('Network error enabling Reddit feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // TAB 3: POPULAR FEEDS
    async function loadPopularTab() {
      const container = document.getElementById('presets-list-container');
      if (!container) return;

      // Ensure channels are available for the dropdowns
      loadDiscordChannels();

      try {
        const res = await fetch('/api/presets', { signal: AbortSignal.timeout(6000) });
        if (!res.ok) {
          container.innerHTML = '<div class="empty-state">Could not load popular feeds catalog.</div>';
          return;
        }
        const presets = await res.json();
        if (!Array.isArray(presets) || !presets.length) {
          container.innerHTML = '<div class="empty-state">No presets available.</div>';
          return;
        }
        cachedPresets = presets;

        const groups = {};
        presets.forEach(p => {
          const cat = p.category || 'General';
          (groups[cat] = groups[cat] || []).push(p);
        });

        let fullHtml = '';
        for (const cat of Object.keys(groups)) {
          const items = groups[cat] || [];
          let itemsHtml = '';
          for (const p of items) {
            const addedBadge = p.alreadyAdded
              ? '<span class="badge badge-green">Added</span>'
              : '<span class="badge badge-amber">Popular</span>';
            const btnHtml = p.alreadyAdded
              ? '<button disabled class="btn btn-ghost btn-sm" style="opacity: 0.6; cursor: default;"><i class="fa-solid fa-check"></i> Added</button>'
              : '<button onclick="enablePreset(\\'' + esc(p.id) + '\\', this)" class="btn btn-primary btn-sm"><i class="fa-solid fa-bolt"></i> Enable</button>';

            itemsHtml += '<div class="feed-item">' +
              '<div class="feed-details">' +
                '<div class="feed-name-row">' +
                  '<span class="feed-name">' + esc(p.name) + '</span>' +
                  addedBadge +
                '</div>' +
                '<div style="font-size: 0.8125rem; color: var(--text-muted);">' + esc(p.description) + '</div>' +
                '<div class="feed-url">' + esc(p.url) + '</div>' +
              '</div>' +
              '<div style="display: flex; align-items: center; gap: 0.5rem; shrink-0;">' +
                '<select data-preset-channel style="width: 200px; font-size: 0.75rem; padding: 0.4rem 0.6rem;">' +
                  buildChannelOptionsHtml('') +
                '</select>' +
                btnHtml +
              '</div>' +
            '</div>';
          }

          fullHtml += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">' +
            '<div style="font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; color: var(--amber); display: flex; align-items: center; gap: 0.375rem;"><i class="fa-solid fa-folder-open"></i> ' + esc(cat) + '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 0.5rem;">' + itemsHtml + '</div>' +
          '</div>';
        }

        container.innerHTML = fullHtml;
      } catch {
        container.innerHTML = '<div class="empty-state">Failed to load popular feeds catalog.</div>';
      }
    }

    async function enablePreset(presetId, btn) {
      const preset = cachedPresets.find(p => p.id === presetId);
      if (!preset) return;
      const row = btn.closest('.feed-item');
      const sel = row ? row.querySelector('select[data-preset-channel]') : null;
      const rawVal = sel ? sel.value : '';

      if (!rawVal) {
        return alert('Please select a destination Discord channel for "' + preset.name + '".');
      }

      let channelId = null;
      if (rawVal.startsWith('channel:')) channelId = rawVal.replace('channel:', '');
      else if (/^[0-9]+$/.test(rawVal)) channelId = rawVal;

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: preset.name, url: preset.url, channelId, feedType: 'rss' })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          alert('Enabled "' + preset.name + '".');
          loadPopularTab();
        } else {
          alert(data.error || 'Failed to enable feed');
        }
      } catch (err) {
        alert('Network error enabling feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // TAB 4: SETTINGS (ADMIN)
    async function loadSettingsTab() {
      const baseUrlInput = document.getElementById('cfg-base-url');
      loadUsersList();
      try {
        const res = await fetch('/api/settings', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        if (baseUrlInput) baseUrlInput.value = data.publicBaseUrl || '';
      } catch {}
    }

    async function saveSystemSettings() {
      const baseUrlInput = document.getElementById('cfg-base-url');
      const publicBaseUrl = baseUrlInput ? baseUrlInput.value.trim() : '';
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicBaseUrl })
        });
        if (!checkAuth(res)) return;
        if (res.ok) alert('Settings saved successfully.');
        else alert('Failed to save settings.');
      } catch {}
    }

    async function loadUsersList() {
      const container = document.getElementById('users-list-container');
      if (!container) return;
      try {
        const res = await fetch('/api/settings/users', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const users = await res.json();
        if (!Array.isArray(users) || !users.length) {
          container.innerHTML = '<div class="empty-state">No registered users found.</div>';
          return;
        }
        container.innerHTML = users.map(u => {
          const roleBadge = (u.role === 'owner' || u.role === 'admin')
            ? '<span class="badge badge-amber"><i class="fa-solid fa-crown"></i> App Team</span>'
            : '<span class="badge badge-gray"><i class="fa-solid fa-user"></i> Member</span>';

          return '<div class="feed-item">' +
            '<div class="feed-details">' +
              '<div class="feed-name-row">' +
                '<span class="feed-name">' + esc(u.displayName || 'Discord User') + '</span>' +
                roleBadge +
              '</div>' +
              '<div class="feed-meta">User ID: #' + u.id + ' &middot; Feeds: ' + u.feedCount + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch {
        if (container) container.innerHTML = '<div class="empty-state">Failed to load users list.</div>';
      }
    }

    // Initialize on page load
    initTheme();
    loadUserProfile();
    loadOverviewTab();

    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab && initialTab !== 'overview') {
      switchTab(initialTab);
    }
  </script>
</body>
</html>`;
}
