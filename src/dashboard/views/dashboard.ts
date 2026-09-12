import { appDisplayName, type AppDeps } from '../../app.js';
import { isOwnerUser, isAdminOrOwner, canUserAccessDashboard } from '../routes/shared.js';

export function getThemeInfo(theme?: string): { id: string; name: string; icon: string } {
  const t = (theme || '').trim().toLowerCase();
  if (t === 'glass' || t === 'glassmorphism') {
    return { id: 'glassmorphism', name: 'Glassmorphism', icon: 'fa-solid fa-wand-magic-sparkles' };
  }
  if (t === 'light') {
    return { id: 'light', name: 'Light', icon: 'fa-solid fa-sun' };
  }
  if (t === 'cyberpunk') {
    return { id: 'cyberpunk', name: 'Cyberpunk', icon: 'fa-solid fa-bolt' };
  }
  if (t === 'dracula') {
    return { id: 'dracula', name: 'Dracula', icon: 'fa-solid fa-skull' };
  }
  if (t === 'nord') {
    return { id: 'nord', name: 'Nord', icon: 'fa-solid fa-snowflake' };
  }
  if (t === 'emerald') {
    return { id: 'emerald', name: 'Emerald', icon: 'fa-solid fa-tree' };
  }
  return { id: 'dark', name: 'Dark', icon: 'fa-solid fa-moon' };
}

export function getColorSchemeInfo(scheme?: string): { id: string; name: string } {
  const s = (scheme || '').trim().toLowerCase();
  if (s === 'purple' || s === 'amethyst') return { id: 'purple', name: 'Amethyst Purple' };
  if (s === 'blue' || s === 'ocean') return { id: 'blue', name: 'Ocean Blue' };
  if (s === 'emerald' || s === 'jade' || s === 'green') return { id: 'emerald', name: 'Emerald Green' };
  if (s === 'rose' || s === 'pink' || s === 'fuchsia') return { id: 'rose', name: 'Rose Pink' };
  if (s === 'amber' || s === 'gold' || s === 'yellow') return { id: 'amber', name: 'Amber Gold' };
  if (s === 'indigo' || s === 'violet') return { id: 'indigo', name: 'Indigo Violet' };
  if (s === 'crimson' || s === 'ruby' || s === 'red') return { id: 'crimson', name: 'Crimson Ruby' };
  if (s === 'teal' || s === 'aqua') return { id: 'teal', name: 'Teal Aqua' };
  if (s === 'sunset' || s === 'coral' || s === 'orange') return { id: 'sunset', name: 'Sunset Coral' };
  if (s === 'cyan' || s === 'electric') return { id: 'cyan', name: 'Electric Cyan' };
  return { id: 'default', name: 'Theme Default' };
}

export function renderDashboardHtml(deps: AppDeps, userId: number | null): string {
  const appName = appDisplayName(deps);
  const appIconUrl = deps.bot?.getAppIconUrl() || null;
  const theme = getThemeInfo(deps.config.defaultTheme);
  const colorScheme = getColorSchemeInfo(deps.config.dashboardColorScheme);

  // Permission check for logged in Discord users without server manage permissions
  if (userId !== null && !canUserAccessDashboard(userId, deps)) {
    return `<!DOCTYPE html>
<html lang="en" class="${theme.id} scheme-${colorScheme.id}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied · ${appName}</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root, html.dark {
      --bg: #0b0f19;
      --card-bg: rgba(17, 24, 39, 0.85);
      --card-inner: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #06b6d4;
    }
    html.light {
      --bg: #e8ecf2;
      --card-bg: rgba(248, 250, 252, 0.95);
      --card-inner: #ffffff;
      --border: #cbd5e1;
      --text: #1e293b;
      --text-muted: #475569;
      --primary: #0284c7;
    }
    html.glassmorphism {
      --bg: #0a0d18;
      --card-bg: rgba(18, 24, 43, 0.55);
      --card-inner: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.12);
      --text: #ffffff;
      --text-muted: #cbd5e1;
      --primary: #a855f7;
    }
    html.glassmorphism body {
      background: radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.16), transparent 35%),
                  radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.16), transparent 35%),
                  radial-gradient(circle at 50% 85%, rgba(236, 72, 153, 0.14), transparent 45%),
                  #0a0d18;
      background-attachment: fixed;
    }
    html.cyberpunk {
      --bg: #05050a;
      --card-bg: rgba(14, 14, 24, 0.92);
      --card-inner: #0a0a12;
      --border: rgba(0, 240, 255, 0.25);
      --text: #fcee0a;
      --text-muted: #e2e8f0;
      --primary: #00f0ff;
    }
    html.dracula {
      --bg: #282a36;
      --card-bg: rgba(40, 42, 54, 0.92);
      --card-inner: #21222c;
      --border: #44475a;
      --text: #f8f8f2;
      --text-muted: #bd93f9;
      --primary: #ff79c6;
    }
    html.nord {
      --bg: #2e3440;
      --card-bg: rgba(46, 52, 64, 0.95);
      --card-inner: #3b4252;
      --border: #434c5e;
      --text: #eceff4;
      --text-muted: #d8dee9;
      --primary: #88c0d0;
    }
    html.emerald {
      --bg: #041712;
      --card-bg: rgba(6, 38, 28, 0.9);
      --card-inner: #07261d;
      --border: #134e3a;
      --text: #ecfdf5;
      --text-muted: #a7f3d0;
      --primary: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 1.25rem; padding: 2rem; max-width: 440px; text-align: center; backdrop-filter: blur(16px); }
    .icon { display: inline-flex; width: 3.5rem; height: 3.5rem; align-items: center; justify-content: center; border-radius: 1rem; background: rgba(245,158,11,0.1); color: #f59e0b; font-size: 1.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 0.75rem; background: var(--card-inner); color: var(--text); font-size: 0.875rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border); cursor: pointer; }
    .btn:hover { border-color: var(--primary); color: var(--primary); }
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
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(deps.config.clientId)}&scope=bot%20applications.commands&permissions=586263558272`
    : null;

  return `<!DOCTYPE html>
<html lang="en" class="${theme.id} scheme-${colorScheme.id}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} · Feed Syndication</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root, html.dark {
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
      --shadow: 0 4px 20px rgba(0,0,0,0.25);
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
      --shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    html.glassmorphism {
      --bg: #0a0d18;
      --card-bg: rgba(18, 24, 43, 0.55);
      --card-inner: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.12);
      --border-hover: rgba(168, 85, 247, 0.5);
      --text: #ffffff;
      --text-muted: #cbd5e1;
      --text-dim: #94a3b8;
      --primary: #a855f7;
      --primary-hover: #9333ea;
      --primary-bg: rgba(168, 85, 247, 0.2);
      --primary-border: rgba(168, 85, 247, 0.45);
      --shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    html.glassmorphism body {
      background: radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.16), transparent 35%),
                  radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.16), transparent 35%),
                  radial-gradient(circle at 50% 85%, rgba(236, 72, 153, 0.14), transparent 45%),
                  #0a0d18;
      background-attachment: fixed;
    }
    html.glassmorphism .card,
    html.glassmorphism nav.sidebar,
    html.glassmorphism header {
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
    }
    html.glassmorphism .stat-card,
    html.glassmorphism .feed-item,
    html.glassmorphism input[type="text"],
    html.glassmorphism select,
    html.glassmorphism textarea {
      background: rgba(255, 255, 255, 0.04) !important;
      backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    html.glassmorphism select {
      background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
        linear-gradient(135deg, var(--text-muted) 50%, transparent 50%) !important;
      background-position: calc(100% - 1.3rem) calc(1em + 0.35rem), calc(100% - 0.95rem) calc(1em + 0.35rem) !important;
      background-size: 0.4rem 0.4rem !important;
      background-repeat: no-repeat !important;
    }
    html.glassmorphism select option,
    html.glassmorphism select optgroup {
      background: #151b2e;
      color: var(--text);
    }
    html.cyberpunk {
      --bg: #05050a;
      --card-bg: rgba(14, 14, 24, 0.92);
      --card-inner: #0a0a12;
      --border: rgba(0, 240, 255, 0.25);
      --border-hover: #00f0ff;
      --text: #fcee0a;
      --text-muted: #e2e8f0;
      --text-dim: #8b9bb4;
      --primary: #00f0ff;
      --primary-hover: #00c8d6;
      --primary-bg: rgba(0, 240, 255, 0.16);
      --primary-border: rgba(0, 240, 255, 0.5);
      --amber: #fcee0a;
      --red: #ff0055;
      --emerald: #00ff9f;
      --shadow: 0 0 20px rgba(0, 240, 255, 0.15);
    }
    html.cyberpunk body {
      background: linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px),
                  #05050a;
      background-size: 32px 32px;
      background-attachment: fixed;
    }
    html.dracula {
      --bg: #282a36;
      --card-bg: rgba(40, 42, 54, 0.92);
      --card-inner: #21222c;
      --border: #44475a;
      --border-hover: #bd93f9;
      --text: #f8f8f2;
      --text-muted: #bd93f9;
      --text-dim: #6272a4;
      --primary: #ff79c6;
      --primary-hover: #ff92d0;
      --primary-bg: rgba(255, 121, 198, 0.15);
      --primary-border: rgba(255, 121, 198, 0.45);
      --emerald: #50fa7b;
      --amber: #f1fa8c;
      --red: #ff5555;
      --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    html.nord {
      --bg: #2e3440;
      --card-bg: rgba(46, 52, 64, 0.95);
      --card-inner: #3b4252;
      --border: #434c5e;
      --border-hover: #88c0d0;
      --text: #eceff4;
      --text-muted: #d8dee9;
      --text-dim: #7b88a1;
      --primary: #88c0d0;
      --primary-hover: #81a1c1;
      --primary-bg: rgba(136, 192, 208, 0.15);
      --primary-border: rgba(136, 192, 208, 0.4);
      --emerald: #a3be8c;
      --amber: #ebcb8b;
      --red: #bf616a;
      --shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }
    html.emerald {
      --bg: #041712;
      --card-bg: rgba(6, 38, 28, 0.9);
      --card-inner: #07261d;
      --border: #134e3a;
      --border-hover: #10b981;
      --text: #ecfdf5;
      --text-muted: #a7f3d0;
      --text-dim: #34d399;
      --primary: #10b981;
      --primary-hover: #059669;
      --primary-bg: rgba(16, 185, 129, 0.16);
      --primary-border: rgba(16, 185, 129, 0.45);
      --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    /* Native control chrome (select dropdowns, checkboxes, scrollbars) follows the theme. */
    html.light { color-scheme: light; }
    html.dark, html.glassmorphism, html.cyberpunk, html.dracula, html.nord, html.emerald { color-scheme: dark; }

    /* Color Scheme Overrides */
    html.scheme-purple, html[class*="scheme-purple"] {
      --primary: #a855f7 !important;
      --primary-hover: #9333ea !important;
      --primary-bg: rgba(168, 85, 247, 0.15) !important;
      --primary-border: rgba(168, 85, 247, 0.4) !important;
    }
    html.scheme-blue, html[class*="scheme-blue"] {
      --primary: #3b82f6 !important;
      --primary-hover: #2563eb !important;
      --primary-bg: rgba(59, 130, 246, 0.15) !important;
      --primary-border: rgba(59, 130, 246, 0.4) !important;
    }
    html.scheme-emerald, html[class*="scheme-emerald"] {
      --primary: #10b981 !important;
      --primary-hover: #059669 !important;
      --primary-bg: rgba(16, 185, 129, 0.15) !important;
      --primary-border: rgba(16, 185, 129, 0.4) !important;
    }
    html.scheme-rose, html[class*="scheme-rose"] {
      --primary: #f43f5e !important;
      --primary-hover: #e11d48 !important;
      --primary-bg: rgba(244, 63, 94, 0.15) !important;
      --primary-border: rgba(244, 63, 94, 0.4) !important;
    }
    html.scheme-amber, html[class*="scheme-amber"] {
      --primary: #f59e0b !important;
      --primary-hover: #d97706 !important;
      --primary-bg: rgba(245, 158, 11, 0.15) !important;
      --primary-border: rgba(245, 158, 11, 0.4) !important;
    }
    html.scheme-indigo, html[class*="scheme-indigo"] {
      --primary: #6366f1 !important;
      --primary-hover: #4f46e5 !important;
      --primary-bg: rgba(99, 102, 241, 0.15) !important;
      --primary-border: rgba(99, 102, 241, 0.4) !important;
    }
    html.scheme-crimson, html[class*="scheme-crimson"] {
      --primary: #ef4444 !important;
      --primary-hover: #dc2626 !important;
      --primary-bg: rgba(239, 68, 68, 0.15) !important;
      --primary-border: rgba(239, 68, 68, 0.4) !important;
    }
    html.scheme-teal, html[class*="scheme-teal"] {
      --primary: #14b8a6 !important;
      --primary-hover: #0d9488 !important;
      --primary-bg: rgba(20, 184, 166, 0.15) !important;
      --primary-border: rgba(20, 184, 166, 0.4) !important;
    }
    html.scheme-sunset, html[class*="scheme-sunset"] {
      --primary: #ff6b6b !important;
      --primary-hover: #fa5252 !important;
      --primary-bg: rgba(255, 107, 107, 0.15) !important;
      --primary-border: rgba(255, 107, 107, 0.4) !important;
    }
    html.scheme-cyan, html[class*="scheme-cyan"] {
      --primary: #06b6d4 !important;
      --primary-hover: #0891b2 !important;
      --primary-bg: rgba(6, 182, 212, 0.15) !important;
      --primary-border: rgba(6, 182, 212, 0.4) !important;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; transition: background-color 0.2s, color 0.2s; }

    /* Header */
    header { position: sticky; top: 0; z-index: 50; background: var(--card-bg); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .header-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text); }
    .brand-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: linear-gradient(135deg, #06b6d4, #3b82f6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(6,182,212,0.3); flex-shrink: 0; }
    .brand-title { font-size: 1.125rem; font-weight: 800; letter-spacing: -0.02em; }
    .brand-title span { color: var(--primary); }
    .brand-sub { font-size: 0.75rem; color: var(--text-muted); }
    .guild-pill { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; border-radius: 9999px; background: var(--card-inner); border: 1px solid var(--border); color: var(--text); font-size: 0.875rem; font-weight: 600; }
    .guild-pill img { width: 1.5rem; height: 1.5rem; border-radius: 50%; object-fit: cover; }
    .nav-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

    /* Layout */
    .container { max-width: 1280px; width: 100%; margin: 0 auto; padding: 1rem; flex: 1; display: flex; gap: 1.25rem; }
    @media (max-width: 860px) { .container { flex-direction: column; padding: 0.875rem; gap: 1rem; } }

    /* Sidebar Navigation */
    nav.sidebar { width: 240px; flex-shrink: 0; background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 1.25rem; padding: 0.875rem; display: flex; flex-direction: column; justify-content: space-between; height: calc(100vh - 6.5rem); position: sticky; top: 5rem; }
    @media (max-width: 860px) {
      nav.sidebar { width: 100%; height: auto; position: static; }
      .tab-list { flex-direction: row !important; overflow-x: auto; gap: 0.5rem; padding-bottom: 0.25rem; scrollbar-width: none; }
      .tab-list::-webkit-scrollbar { display: none; }
      .tab-btn { width: auto !important; white-space: nowrap; min-height: 44px; }
      .tab-btn i { margin-right: 0; }
      .tab-btn span { display: none; }
      .sidebar-footer { display: none !important; }
    }
    .tab-list { display: flex; flex-direction: column; gap: 0.375rem; }
    .tab-btn { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); background: transparent; border: 1px solid transparent; cursor: pointer; text-align: left; transition: all 0.15s; min-height: 44px; }
    .tab-btn:hover { background: rgba(255,255,255,0.05); color: var(--text); }
    .tab-btn.active { color: var(--primary); background: var(--primary-bg); border-color: var(--primary-border); }
    .sidebar-footer { padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-dim); display: flex; justify-content: space-between; }
    .sidebar-footer a { color: var(--text-muted); text-decoration: none; }
    .sidebar-footer a:hover { color: var(--primary); }

    /* Main Content */
    main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1.25rem; }
    .tab-pane { display: none; flex-direction: column; gap: 1.25rem; }
    .tab-pane.active { display: flex; }

    /* Cards & Components */
    .card { background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .card-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .card-title { font-size: 1rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 0.5rem; }
    .card-desc { font-size: 0.8125rem; color: var(--text-muted); }

    /* Guild Selection */
    .guild-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    @media (max-width: 480px) { .guild-grid { grid-template-columns: 1fr; } }
    @media (min-width: 481px) and (max-width: 860px) { .guild-grid { grid-template-columns: repeat(2, 1fr); } }
    .guild-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem; transition: border-color 0.15s, transform 0.15s; }
    .guild-card:hover { border-color: var(--primary); transform: translateY(-2px); }
    .guild-icon { width: 4.5rem; height: 4.5rem; border-radius: 1rem; object-fit: cover; background: var(--card-inner); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: var(--text-muted); }
    .guild-name { font-size: 1.125rem; font-weight: 700; color: var(--text); }

    /* Category Grid */
    .category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; align-items: start; }
    @media (max-width: 1100px) { .category-grid { grid-template-columns: 1fr; } }
    .category-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .category-card.rss { border-top: 4px solid var(--primary); }
    .category-card.reddit { border-top: 4px solid #ff4500; }
    .category-card.freegames { border-top: 4px solid #10b981; }
    .category-header { display: flex; align-items: center; gap: 0.75rem; }
    .category-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
    .category-icon.rss { background: rgba(6, 182, 212, 0.15); color: var(--primary); }
    .category-icon.reddit { background: rgba(255, 69, 0, 0.15); color: #ff4500; }
    .category-icon.freegames { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .category-title { font-size: 1.125rem; font-weight: 800; }
    .target-readout { font-size: 0.75rem; color: var(--text-muted); background: var(--card-inner); border: 1px solid var(--border); border-radius: 0.75rem; padding: 0.5rem 0.75rem; }

    /* Grid layout */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
    .stat-card { background: var(--card-inner); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; }
    .stat-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .stat-value { font-size: 1.875rem; font-weight: 800; color: var(--primary); margin-top: 0.5rem; }
    .stat-sub { font-size: 0.75rem; color: var(--text-dim); margin-top: 0.25rem; }

    /* Form Controls */
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    input[type="text"], select, textarea { width: 100%; background: var(--card-inner); border: 1px solid var(--border); border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--text); outline: none; transition: border-color 0.15s; min-height: 44px; }
    select {
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      padding-right: 2.5rem !important;
      background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
        linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
      background-position: calc(100% - 1.3rem) calc(1em + 0.35rem), calc(100% - 0.95rem) calc(1em + 0.35rem);
      background-size: 0.4rem 0.4rem;
      background-repeat: no-repeat;
    }
    select option, select optgroup { background: var(--card-inner); color: var(--text); }
    select option:disabled { color: var(--text-dim); }
    input[type="checkbox"], input[type="radio"] { accent-color: var(--primary); width: 1.125rem; height: 1.125rem; cursor: pointer; }
    input[type="text"]:focus, select:focus, textarea:focus { border-color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: all 0.15s; min-height: 44px; }
    .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(6,182,212,0.25); }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-discord { background: var(--discord); color: #fff; }
    .btn-discord:hover { background: var(--discord-hover); }
    .btn-ghost { background: var(--card-inner); color: var(--text-muted); border-color: var(--border); }
    .btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--text); }
    .btn-danger { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }
    .btn-danger:hover { background: rgba(239,68,68,0.3); color: #fff; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: 0.5rem; min-height: 36px; }
    .btn-block { width: 100%; }

    /* Feed & List Items */
    .feed-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .feed-pill { background: var(--card-inner); border: 1px solid var(--border); border-radius: 0.875rem; padding: 0.625rem 0.875rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
    .feed-details { min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
    .feed-name-row { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .feed-name { font-weight: 700; font-size: 0.875rem; color: var(--text); }
    .feed-url { font-size: 0.75rem; color: var(--text-dim); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px; }
    .feed-meta { font-size: 0.6875rem; color: var(--text-dim); }
    .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.45rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; }
    .badge-green { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .badge-red { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .badge-gray { background: rgba(156,163,175,0.12); color: #9ca3af; border: 1px solid var(--border); }
    .badge-amber { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }

    /* Interval Pills */
    .interval-group { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .interval-btn { padding: 0.5rem 1rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 600; background: var(--card-inner); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.15s; min-height: 40px; }
    .interval-btn:hover { background: rgba(255,255,255,0.05); color: var(--text); }
    .interval-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }

    .empty-state { padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }

    /* Utility */
    .section-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.25rem; }
    .section-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.75rem; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <div class="header-left">
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
      <div id="current-guild-pill" class="guild-pill hidden">
        <img id="current-guild-icon" src="" alt="">
        <span id="current-guild-name">Server</span>
      </div>
    </div>

    <div class="nav-actions">
      <span class="badge badge-gray" title="Active Theme: ${theme.name}${colorScheme.id !== 'default' ? ` · Scheme: ${colorScheme.name}` : ''} (Configured via .env)" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;">
        <i class="${theme.icon}" style="color: var(--primary); margin-right: 0.25rem;"></i> ${theme.name}${colorScheme.id !== 'default' ? ` <span style="opacity: 0.7; font-size: 0.6875rem;">(${colorScheme.name})</span>` : ''}
      </span>
      ${
        botInviteUrl
          ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-discord btn-sm">
        <i class="fa-brands fa-discord"></i> <span class="btn-text">Invite Bot</span>
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
    <!-- Guild Selection View -->
    <div id="guild-selection-view" class="tab-pane active" style="width: 100%;">
      <div>
        <div class="section-title"><i class="fa-solid fa-server" style="color: var(--primary);"></i> Select a Server</div>
        <div class="section-desc">Choose a Discord server to manage its feeds and delivery channels.</div>
      </div>
      <div id="guild-grid" class="guild-grid">
        <div class="empty-state">Loading servers...</div>
      </div>
      <div id="guild-empty-state" class="empty-state hidden">
        <div style="font-size: 1.25rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-robot"></i></div>
        <div>No manageable servers found. Make sure the bot has been added to a server where you have <strong>Manage Channels</strong> permission.</div>
        ${botInviteUrl ? `<div style="margin-top: 1rem;"><a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-discord"><i class="fa-brands fa-discord"></i> Invite Bot</a></div>` : ''}
      </div>
    </div>

    <!-- Dashboard View -->
    <div id="dashboard-view" class="tab-pane" style="width: 100%; flex-direction: row;">
      <!-- Sidebar -->
      <nav class="sidebar">
        <div class="tab-list">
          <button onclick="switchTab('overview')" id="tab-btn-overview" class="tab-btn active">
            <i class="fa-solid fa-chart-line"></i> <span>Overview</span>
          </button>
          <button onclick="switchTab('categories')" id="tab-btn-categories" class="tab-btn">
            <i class="fa-solid fa-layer-group"></i> <span>Categories</span>
          </button>
          <button onclick="switchTab('news')" id="tab-btn-news" class="tab-btn">
            <i class="fa-solid fa-newspaper" style="color: var(--amber);"></i> <span>News</span>
          </button>
          ${
            isHost
              ? `<button onclick="switchTab('settings')" id="tab-btn-settings" class="tab-btn">
            <i class="fa-solid fa-sliders"></i> <span>Settings</span>
          </button>`
              : ''
          }
          ${
            isOwner
              ? `<button onclick="switchTab('devtools')" id="tab-btn-devtools" class="tab-btn">
            <i class="fa-solid fa-screwdriver-wrench" style="color: var(--primary);"></i> <span>Dev Tools</span>
          </button>`
              : ''
          }
        </div>

        <div class="sidebar-footer">
          <a href="/dashboard" onclick="clearGuild(event)" id="change-server-link">Change Server</a>
          <span>&middot;</span>
          <a href="/privacy">Privacy</a>
          <span>&middot;</span>
          <a href="/tos">Terms</a>
        </div>
      </nav>

      <!-- Main View -->
      <main>
        <!-- TAB 1: OVERVIEW -->
        <section id="tab-overview" class="tab-pane active">
          <div>
            <div class="section-title"><i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i> Server Overview</div>
            <div class="section-desc">Feeds and delivery status for the selected server.</div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Feeds</div>
              <div class="stat-value" id="stat-total-feeds">0</div>
              <div class="stat-sub">In this server</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active Feeds</div>
              <div class="stat-value" style="color: #10b981;" id="stat-active-feeds">0</div>
              <div class="stat-sub">Enabled and polling</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">RSS Feeds</div>
              <div class="stat-value" id="stat-rss-feeds">0</div>
              <div class="stat-sub">News & custom RSS</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Reddit Feeds</div>
              <div class="stat-value" style="color: #ff4500;" id="stat-reddit-feeds">0</div>
              <div class="stat-sub">Subreddits</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Free Games Feeds</div>
              <div class="stat-value" style="color: #10b981;" id="stat-freegames-feeds">0</div>
              <div class="stat-sub">Daily game drops</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Database Engine</div>
              <div class="stat-value" style="color: #5865F2;">${Math.round(dbStats.dbSizeBytes / 1024)} KB</div>
              <div class="stat-sub">SQLite persistence</div>
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

        <!-- TAB 2: CATEGORIES -->
        <section id="tab-categories" class="tab-pane">
          <div>
            <div class="section-title"><i class="fa-solid fa-layer-group" style="color: var(--primary);"></i> Feed Categories</div>
            <div class="section-desc">Configure delivery targets and manage feeds for each category in this server.</div>
          </div>

          <div id="category-targets-grid" class="category-grid">
            <!-- RSS Card -->
            <div class="category-card rss">
              <div class="category-header">
                <div class="category-icon rss"><i class="fa-solid fa-rss"></i></div>
                <div>
                  <div class="category-title" style="color: var(--primary);">RSS</div>
                  <div class="card-desc">News, blogs, and custom RSS/Atom feeds</div>
                </div>
              </div>
              <div class="target-readout" id="rss-target-readout">Loading target...</div>
              <div class="form-group">
                <label class="form-label">Target Channel</label>
                <select id="rss-target-channel"></select>
              </div>
              <div class="form-group">
                <label class="form-label">Target Forum Thread Channel (optional)</label>
                <select id="rss-target-thread"></select>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button onclick="saveCategoryTarget('rss')" class="btn btn-primary btn-sm"><i class="fa-solid fa-floppy-disk"></i> Save Target</button>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.25rem;">
                <div class="card-title" style="font-size: 0.9375rem;"><i class="fa-solid fa-plus-circle" style="color: var(--primary);"></i> Add RSS Feed</div>
                <div class="form-grid" style="margin-top: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label">Feed Name</label>
                    <input type="text" id="add-rss-name" placeholder="E.g., TechCrunch News">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Feed URL</label>
                    <input type="text" id="add-rss-url" placeholder="https://example.com/rss.xml" style="font-family: monospace;">
                  </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                  <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="add-rss-scrape" onchange="toggleScrapeFields('rss')">
                    <span>Scrape webpage (HTML selector mode)</span>
                  </label>
                </div>
                <div id="rss-scrape-fields" style="display: none;">
                  <div class="form-grid" style="margin-top: 0.5rem;">
                    <div class="form-group">
                      <label class="form-label">Item Selector</label>
                      <input type="text" id="add-rss-scrape-item" placeholder="article">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Title Selector</label>
                      <input type="text" id="add-rss-scrape-title" placeholder="h2 a">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Link Selector</label>
                      <input type="text" id="add-rss-scrape-link" placeholder="a">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Description Selector (optional)</label>
                      <input type="text" id="add-rss-scrape-desc" placeholder=".summary">
                    </div>
                  </div>
                </div>
                <button onclick="submitAddRssFeed()" class="btn btn-primary btn-sm btn-block" style="margin-top: 0.75rem;"><i class="fa-solid fa-plus"></i> Add RSS Feed</button>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 1rem;">
                <div class="card-title" style="font-size: 0.9375rem;"><i class="fa-solid fa-list" style="color: var(--primary);"></i> RSS Feeds</div>
                <div id="rss-feeds-list" class="feed-list" style="margin-top: 0.75rem;">
                  <div class="empty-state">Loading feeds...</div>
                </div>
              </div>
            </div>

            <!-- Reddit Card -->
            <div class="category-card reddit">
              <div class="category-header">
                <div class="category-icon reddit"><i class="fa-brands fa-reddit"></i></div>
                <div>
                  <div class="category-title" style="color: #ff4500;">Reddit</div>
                  <div class="card-desc">Subreddit image and RSS feeds</div>
                </div>
              </div>
              <div class="target-readout" id="reddit-target-readout">Loading target...</div>
              <div class="form-group">
                <label class="form-label">Target Channel</label>
                <select id="reddit-target-channel"></select>
              </div>
              <div class="form-group">
                <label class="form-label">Target Forum Thread Channel (optional)</label>
                <select id="reddit-target-thread"></select>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button onclick="saveCategoryTarget('reddit')" class="btn btn-primary btn-sm" style="background: #ff4500; border-color: #ff4500;"><i class="fa-solid fa-floppy-disk"></i> Save Target</button>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.25rem;">
                <div class="card-title" style="font-size: 0.9375rem;"><i class="fa-brands fa-reddit" style="color: #ff4500;"></i> Add Reddit Feed</div>
                <div class="form-grid" style="margin-top: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label">Subreddit</label>
                    <input type="text" id="add-reddit-sub" placeholder="e.g. wallpapers" oninput="handleRedditSubInput(this.value)">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Display Name (optional)</label>
                    <input type="text" id="add-reddit-name" placeholder="Reddit · r/wallpapers">
                  </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                  <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="add-reddit-image-mode" checked>
                    <span>Pure image mode (images/GIFs only)</span>
                  </label>
                </div>
                <button onclick="submitAddRedditFeed()" class="btn btn-primary btn-sm btn-block" style="margin-top: 0.75rem; background: #ff4500; border-color: #ff4500;"><i class="fa-brands fa-reddit"></i> Add Reddit Feed</button>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 1rem;">
                <div class="card-title" style="font-size: 0.9375rem;"><i class="fa-brands fa-reddit" style="color: #ff4500;"></i> Reddit Feeds</div>
                <div id="reddit-feeds-list" class="feed-list" style="margin-top: 0.75rem;">
                  <div class="empty-state">Loading feeds...</div>
                </div>
              </div>
            </div>

            <!-- Free Games Card -->
            <div class="category-card freegames">
              <div class="category-header">
                <div class="category-icon freegames"><i class="fa-solid fa-gift"></i></div>
                <div>
                  <div class="category-title" style="color: #10b981;">Free Games</div>
                  <div class="card-desc">Epic, Steam, GOG, and more</div>
                </div>
              </div>
              <div class="target-readout" id="freegames-target-readout">Loading target...</div>
              <div class="form-group">
                <label class="form-label">Target Channel</label>
                <select id="freegames-target-channel"></select>
              </div>
              <div class="form-group">
                <label class="form-label">Target Forum Thread Channel (optional)</label>
                <select id="freegames-target-thread"></select>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button onclick="saveCategoryTarget('freegames')" class="btn btn-primary btn-sm" style="background: #10b981; border-color: #10b981;"><i class="fa-solid fa-floppy-disk"></i> Save Target</button>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.25rem;">
                <div class="card-title" style="font-size: 0.9375rem;"><i class="fa-solid fa-gift" style="color: #10b981;"></i> Add Free Games Feed</div>
                <div class="form-grid" style="margin-top: 0.75rem;">
                  <div class="form-group">
                    <label class="form-label">Platform</label>
                    <select id="add-freegames-platform" onchange="handleFreeGamesPlatformChange(this.value)">
                      <option value="all">All Platforms</option>
                      <option value="epic">Epic Games Store</option>
                      <option value="steam">Steam Giveaways</option>
                      <option value="gog">GOG Promotions</option>
                      <option value="indiegala">IndieGala Freebies</option>
                      <option value="humble">Humble Bundle</option>
                      <option value="itchio">Itch.io Freebies</option>
                      <option value="ubisoft">Ubisoft Giveaways</option>
                      <option value="prime">Prime Gaming</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Display Name (optional)</label>
                    <input type="text" id="add-freegames-name" placeholder="Free Games · All Stores">
                  </div>
                </div>
                <button onclick="submitAddFreeGamesFeed()" class="btn btn-primary btn-sm btn-block" style="margin-top: 0.75rem; background: #10b981; border-color: #10b981;"><i class="fa-solid fa-gift"></i> Add Free Games Feed</button>
              </div>

              <div style="border-top: 1px solid var(--border); padding-top: 1rem;">
                <div class="card-title" style="font-size: 0.9375rem;"><i class="fa-solid fa-list-check" style="color: #10b981;"></i> Free Games Feeds</div>
                <div id="freegames-feeds-list" class="feed-list" style="margin-top: 0.75rem;">
                  <div class="empty-state">Loading feeds...</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 3: NEWS FEEDS CATALOG -->
        <section id="tab-news" class="tab-pane">
          <div class="card">
            <div>
              <div class="card-title"><i class="fa-solid fa-newspaper" style="color: var(--amber);"></i> News Feeds Catalog</div>
              <div class="card-desc">One-click subscribe to top news, tech, gaming, science, and developer feeds. Presets are added as RSS feeds in this server using the RSS category target.</div>
            </div>
            <div id="presets-list-container" style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div class="empty-state">Loading news feeds catalog...</div>
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
              <div class="form-group">
                <label class="form-label">Active Dashboard Theme &amp; Color Scheme</label>
                <input type="text" value="${theme.name} (${theme.id}) &bull; ${colorScheme.name} (${colorScheme.id})" disabled style="opacity: 0.85; cursor: not-allowed;" title="Configured via DASHBOARD_THEME and DASHBOARD_COLOR_SCHEME environment variables">
                <span style="font-size: 0.6875rem; color: var(--text-dim); margin-top: 0.25rem;">Configured via <code style="color: var(--primary);">DASHBOARD_THEME</code> and <code style="color: var(--primary);">DASHBOARD_COLOR_SCHEME</code> in <code style="color: var(--primary);">.env</code>. Themes: <code style="color: var(--text-muted);">glassmorphism</code>, <code style="color: var(--text-muted);">dark</code>, <code style="color: var(--text-muted);">light</code>, <code style="color: var(--text-muted);">cyberpunk</code>, <code style="color: var(--text-muted);">dracula</code>, <code style="color: var(--text-muted);">nord</code>, <code style="color: var(--text-muted);">emerald</code>. Color Schemes: <code style="color: var(--text-muted);">cyan</code>, <code style="color: var(--text-muted);">purple</code>, <code style="color: var(--text-muted);">blue</code>, <code style="color: var(--text-muted);">emerald</code>, <code style="color: var(--text-muted);">rose</code>, <code style="color: var(--text-muted);">amber</code>, <code style="color: var(--text-muted);">indigo</code>, <code style="color: var(--text-muted);">crimson</code>, <code style="color: var(--text-muted);">teal</code>, <code style="color: var(--text-muted);">sunset</code>.</span>
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

        <!-- TAB 5: DEVELOPER TOOLS (BOT OWNER / TEAM ONLY) -->
        ${
          isOwner
            ? `<section id="tab-devtools" class="tab-pane">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title"><i class="fa-solid fa-screwdriver-wrench" style="color: var(--primary);"></i> Developer Tools</div>
                <div class="card-desc">Discord bot owner/team diagnostics, service logs, and manual maintenance triggers.</div>
              </div>
              <button onclick="loadDevToolsTab()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Feeds</div><div class="stat-value" id="dt-feed-count">-</div><div class="stat-sub">All syndicated feeds</div></div>
            <div class="stat-card"><div class="stat-label">Entries Delivered</div><div class="stat-value" id="dt-sent-count">-</div><div class="stat-sub">Messages sent to Discord</div></div>
            <div class="stat-card"><div class="stat-label">Registered Users</div><div class="stat-value" id="dt-user-count">-</div><div class="stat-sub">Dashboard accounts</div></div>
            <div class="stat-card"><div class="stat-label">Database Size</div><div class="stat-value" id="dt-db-size">-</div><div class="stat-sub">SQLite persistence</div></div>
            <div class="stat-card"><div class="stat-label">Process Uptime</div><div class="stat-value" id="dt-uptime">-</div><div class="stat-sub">Since service start</div></div>
            <div class="stat-card"><div class="stat-label">Memory RSS</div><div class="stat-value" id="dt-memory">-</div><div class="stat-sub">Heap: <span id="dt-heap">-</span></div></div>
            <div class="stat-card"><div class="stat-label">Node.js</div><div class="stat-value" id="dt-node">-</div><div class="stat-sub">Runtime version</div></div>
            <div class="stat-card"><div class="stat-label">Platform</div><div class="stat-value" id="dt-platform">-</div><div class="stat-sub">Operating environment</div></div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title"><i class="fa-solid fa-bolt" style="color: var(--primary);"></i> Developer Actions</div>
                <div class="card-desc">Manual maintenance triggers. Every action is recorded in the Service Logs below.</div>
              </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <button onclick="syncDiscordCommands()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-arrow-right-arrow-left"></i> Sync Discord Slash Commands</button>
              <button onclick="optimizeDatabase()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-database"></i> Optimize SQLite DB</button>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title"><i class="fa-solid fa-list-ul" style="color: var(--primary);"></i> Service Logs</div>
                <div class="card-desc">Full activity log with level filtering.</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <select id="devtools-log-level" onchange="renderActivityLogs()" style="width: auto; padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                  <option value="">All levels</option>
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="error">error</option>
                  <option value="debug">debug</option>
                </select>
                <select id="devtools-log-limit" onchange="renderActivityLogs()" style="width: auto; padding: 0.375rem 0.75rem; font-size: 0.75rem;">
                  <option value="50">50</option>
                  <option value="100" selected>100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                </select>
                <button onclick="renderActivityLogs()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-rotate-right"></i> Refresh Logs</button>
              </div>
            </div>
            <div id="devtools-logs" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 480px; overflow-y: auto;">
              <div class="empty-state">Loading service logs...</div>
            </div>
          </div>
        </section>`
            : ''
        }
      </main>
    </div>
  </div>

  <script>
    // Sanitizer
    function esc(s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function guildIconUrl(guildId, icon) {
      if (!icon) return null;
      return 'https://cdn.discordapp.com/icons/' + esc(guildId) + '/' + esc(icon) + '.png';
    }

    // State caches
    let currentGuildId = null;
    let currentGuild = null;
    let cachedGuilds = [];
    let cachedCategories = null;
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

      if (tabId === 'overview') loadOverviewTab();
      else if (tabId === 'categories') loadCategoriesTab();
      else if (tabId === 'news') loadNewsTab();
      else if (tabId === 'settings') loadSettingsTab();
      else if (tabId === 'devtools') loadDevToolsTab();
    }

    function clearGuild(event) {
      if (event) event.preventDefault();
      window.location.href = '/dashboard';
    }

    function selectGuild(guildId) {
      const params = new URLSearchParams(window.location.search);
      params.set('guild', guildId);
      window.location.search = params.toString();
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

    // Guild selection
    async function loadGuildSelection() {
      const grid = document.getElementById('guild-grid');
      const empty = document.getElementById('guild-empty-state');
      if (!grid || !empty) return;
      try {
        const res = await fetch('/api/guilds', { signal: AbortSignal.timeout(6000) });
        if (!checkAuth(res)) return;
        const data = await res.json();
        cachedGuilds = data.guilds || [];
        if (!cachedGuilds.length) {
          grid.innerHTML = '';
          empty.classList.remove('hidden');
          return;
        }
        empty.classList.add('hidden');
        grid.innerHTML = cachedGuilds.map(g => {
          const icon = guildIconUrl(g.id, g.icon);
          return '<div class="guild-card">' +
            (icon ? '<img class="guild-icon" src="' + icon + '" alt="' + esc(g.name) + '">' : '<div class="guild-icon"><i class="fa-solid fa-server"></i></div>') +
            '<div class="guild-name">' + esc(g.name) + '</div>' +
            '<button onclick="selectGuild(&quot;' + esc(g.id) + '&quot;)" class="btn btn-primary"><i class="fa-solid fa-gear"></i> Manage Server</button>' +
          '</div>';
        }).join('');
      } catch {
        grid.innerHTML = '<div class="empty-state">Failed to load servers.</div>';
      }
    }

    function setupGuildHeader() {
      const pill = document.getElementById('current-guild-pill');
      const iconEl = document.getElementById('current-guild-icon');
      const nameEl = document.getElementById('current-guild-name');
      if (!pill || !nameEl) return;
      if (currentGuild) {
        nameEl.textContent = currentGuild.name || 'Server';
        const icon = guildIconUrl(currentGuild.guildId || currentGuild.id, currentGuild.icon);
        if (icon && iconEl) {
          iconEl.src = icon;
          iconEl.alt = currentGuild.name || 'Server';
          iconEl.classList.remove('hidden');
        } else if (iconEl) {
          iconEl.src = '';
          iconEl.classList.add('hidden');
        }
        pill.classList.remove('hidden');
      } else {
        pill.classList.add('hidden');
      }
    }

    function getGuildName(guildId) {
      const g = cachedGuilds.find(x => x.id === guildId);
      return g ? g.name : (currentGuild ? currentGuild.name : guildId);
    }

    async function loadGuildDashboard() {
      const selectionView = document.getElementById('guild-selection-view');
      const dashboardView = document.getElementById('dashboard-view');
      if (selectionView) selectionView.classList.remove('active');
      if (dashboardView) dashboardView.classList.add('active');

      try {
        const res = await fetch('/api/guilds/' + encodeURIComponent(currentGuildId) + '/categories', { signal: AbortSignal.timeout(6000) });
        if (res.status === 403 || res.status === 401) {
          alert('You do not have permission to manage this server.');
          clearGuild();
          return;
        }
        if (!res.ok) {
          alert('Could not load server configuration.');
          clearGuild();
          return;
        }
        cachedCategories = await res.json();
        currentGuild = { guildId: cachedCategories.guildId, name: cachedCategories.name, icon: cachedCategories.icon };
        setupGuildHeader();
        populateCategoryTargets();
        loadOverviewTab();
      } catch {
        alert('Failed to load server configuration.');
        clearGuild();
      }
    }

    function populateCategoryTargetSelect(selectId, channels, currentId, placeholder) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      let html = '<option value="">' + esc(placeholder) + '</option>';
      if (channels && channels.length) {
        channels.forEach(ch => {
          const selected = ch.id === currentId ? 'selected' : '';
          html += '<option value="' + esc(ch.id) + '" ' + selected + '>#' + esc(ch.name) + '</option>';
        });
      }
      sel.innerHTML = html;
    }

    function populateCategoryTargets() {
      if (!cachedCategories) return;
      const textChannels = cachedCategories.textChannels || [];
      const forumChannels = cachedCategories.forumChannels || [];
      const targets = cachedCategories.categories || [];
      const getTarget = (cat) => targets.find(t => t.category === cat) || { channelId: null, threadChannelId: null };

      ['rss', 'reddit', 'freegames'].forEach(cat => {
        const target = getTarget(cat);
        populateCategoryTargetSelect(cat + '-target-channel', textChannels, target.channelId, '-- Select Channel --');
        populateCategoryTargetSelect(cat + '-target-thread', forumChannels, target.threadChannelId, '-- No Forum Thread --');
        updateTargetReadout(cat, target, textChannels, forumChannels);
      });
    }

    function channelNameById(channels, id) {
      if (!id) return null;
      const ch = (channels || []).find(c => c.id === id);
      return ch ? '#' + ch.name : '#' + id.slice(-6);
    }

    function updateTargetReadout(category, target, textChannels, forumChannels) {
      const el = document.getElementById(category + '-target-readout');
      if (!el) return;
      const channel = channelNameById(textChannels, target.channelId) || 'none';
      const thread = channelNameById(forumChannels, target.threadChannelId) || 'none';
      el.innerHTML = 'Channel: <strong>' + esc(channel) + '</strong> &middot; Thread: <strong>' + esc(thread) + '</strong>';
    }

    async function saveCategoryTarget(category) {
      if (!currentGuildId) return;
      const channelSel = document.getElementById(category + '-target-channel');
      const threadSel = document.getElementById(category + '-target-thread');
      const channelId = channelSel ? channelSel.value || null : null;
      const threadChannelId = threadSel ? threadSel.value || null : null;
      try {
        const res = await fetch('/api/guilds/' + encodeURIComponent(currentGuildId) + '/categories/' + encodeURIComponent(category), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, threadChannelId })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          if (cachedCategories && cachedCategories.categories) {
            const idx = cachedCategories.categories.findIndex(t => t.category === category);
            if (idx >= 0) cachedCategories.categories[idx] = data;
            else cachedCategories.categories.push(data);
          }
          populateCategoryTargets();
          alert('Saved ' + category + ' target for this server.');
        } else {
          alert((data && data.error) || 'Failed to save target.');
        }
      } catch {
        alert('Network error saving target.');
      }
    }

    function categoryForFeed(feed) {
      const t = feed.feedType;
      if (t === 'reddit') return 'reddit';
      if (t === 'rss' || t === 'scrape') return 'rss';
      if (t && t.startsWith('free_games')) return 'freegames';
      return null;
    }

    async function loadGuildFeeds() {
      try {
        const res = await fetch('/api/feeds', { signal: AbortSignal.timeout(6000) });
        if (!checkAuth(res)) return [];
        const feeds = await res.json();
        return Array.isArray(feeds) ? feeds.filter(f => f.guildId === currentGuildId) : [];
      } catch {
        return [];
      }
    }

    function renderFeedPill(f) {
      const isReddit = f.feedType === 'reddit';
      const isFreeGames = f.feedType === 'free_games' || (f.feedType && f.feedType.startsWith('free_games'));
      const isScrape = f.feedType === 'scrape';
      let typeBadge = '<span class="badge badge-gray"><i class="fa-solid fa-rss"></i> RSS</span>';
      if (isReddit) typeBadge = '<span class="badge" style="background: rgba(255,69,0,0.15); color: #ff4500; border: 1px solid rgba(255,69,0,0.3);"><i class="fa-brands fa-reddit"></i> Reddit</span>';
      else if (isFreeGames) typeBadge = '<span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);"><i class="fa-solid fa-gift"></i> Free Games</span>';
      else if (isScrape) typeBadge = '<span class="badge badge-amber"><i class="fa-solid fa-code"></i> Scraper</span>';
      const statusBadge = f.enabled
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-gray">Paused</span>';
      const lastPolled = f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never polled';
      return '<div class="feed-pill">' +
        '<div class="feed-details">' +
          '<div class="feed-name-row">' +
            '<span class="feed-name">' + esc(f.name) + '</span>' +
            typeBadge +
            statusBadge +
          '</div>' +
          '<div class="feed-url">' + esc(f.url) + '</div>' +
          '<div class="feed-meta">Checked: ' + lastPolled + '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 0.375rem; flex-shrink: 0;">' +
          '<button onclick="toggleFeed(' + f.id + ', ' + (f.enabled ? 'false' : 'true') + ')" class="btn btn-ghost btn-sm" title="' + (f.enabled ? 'Pause' : 'Resume') + '">' +
            '<i class="fa-solid ' + (f.enabled ? 'fa-pause' : 'fa-play') + '"></i>' +
          '</button>' +
          '<button onclick="deleteFeed(' + f.id + ')" class="btn btn-danger btn-sm" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
        '</div>' +
      '</div>';
    }

    async function renderCategoryFeeds(category) {
      const container = document.getElementById(category + '-feeds-list');
      if (!container) return;
      container.innerHTML = '<div class="empty-state">Loading feeds...</div>';
      const feeds = await loadGuildFeeds();
      const categoryFeeds = feeds.filter(f => categoryForFeed(f) === category);
      if (!categoryFeeds.length) {
        container.innerHTML = '<div class="empty-state">No ' + category + ' feeds for this server yet.</div>';
        return;
      }
      container.innerHTML = categoryFeeds.map(renderFeedPill).join('');
    }

    async function loadCategoriesTab() {
      if (!cachedCategories && currentGuildId) {
        await loadGuildDashboard();
        return;
      }
      populateCategoryTargets();
      await Promise.all(['rss', 'reddit', 'freegames'].map(renderCategoryFeeds));
    }

    // TAB 1: OVERVIEW
    async function loadOverviewTab() {
      const activityEl = document.getElementById('activity-list');
      const totalEl = document.getElementById('stat-total-feeds');
      const activeEl = document.getElementById('stat-active-feeds');
      const rssEl = document.getElementById('stat-rss-feeds');
      const redditEl = document.getElementById('stat-reddit-feeds');
      const freegamesEl = document.getElementById('stat-freegames-feeds');

      try {
        const [feeds, statsRes] = await Promise.all([
          loadGuildFeeds(),
          fetch('/api/stats', { signal: AbortSignal.timeout(5000) })
        ]);
        const total = feeds.length;
        const active = feeds.filter(f => f.enabled).length;
        const rss = feeds.filter(f => categoryForFeed(f) === 'rss').length;
        const reddit = feeds.filter(f => categoryForFeed(f) === 'reddit').length;
        const freegames = feeds.filter(f => categoryForFeed(f) === 'freegames').length;
        if (totalEl) totalEl.textContent = String(total);
        if (activeEl) activeEl.textContent = String(active);
        if (rssEl) rssEl.textContent = String(rss);
        if (redditEl) redditEl.textContent = String(reddit);
        if (freegamesEl) freegamesEl.textContent = String(freegames);

        if (activityEl && statsRes.ok) {
          const data = await statsRes.json();
          if (data.activity && data.activity.length) {
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
          } else {
            activityEl.innerHTML = '<div class="empty-state">No recent activity recorded yet.</div>';
          }
        } else if (activityEl) {
          activityEl.innerHTML = '<div class="empty-state">Could not load activity.</div>';
        }
      } catch {
        if (activityEl) activityEl.innerHTML = '<div class="empty-state">Could not load activity.</div>';
      }
    }

    // Feed actions
    async function toggleFeed(id, enabled) {
      try {
        const res = await fetch('/api/feeds/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        if (!checkAuth(res)) return;
        refreshCurrentTab();
      } catch {}
    }

    async function deleteFeed(id) {
      if (!confirm('Are you sure you want to remove this feed?')) return;
      try {
        const res = await fetch('/api/feeds/' + id, { method: 'DELETE' });
        if (!checkAuth(res)) return;
        refreshCurrentTab();
      } catch {}
    }

    function refreshCurrentTab() {
      if (activeTabName === 'overview') loadOverviewTab();
      else if (activeTabName === 'categories') loadCategoriesTab();
      else if (activeTabName === 'news') loadNewsTab();
    }

    // RSS
    function toggleScrapeFields(category) {
      const box = document.getElementById(category + '-scrape-fields');
      const chk = document.getElementById('add-' + category + '-scrape');
      if (box) box.style.display = chk && chk.checked ? 'block' : 'none';
    }

    async function submitAddRssFeed() {
      if (!currentGuildId) return;
      const nameInput = document.getElementById('add-rss-name');
      const urlInput = document.getElementById('add-rss-url');
      const scrapeChk = document.getElementById('add-rss-scrape');
      const name = nameInput ? nameInput.value.trim() : '';
      const url = urlInput ? urlInput.value.trim() : '';
      if (!name || !url) return alert('Please enter both feed name and URL.');

      let feedType = 'rss';
      let scrape = null;
      if (scrapeChk && scrapeChk.checked) {
        const item = document.getElementById('add-rss-scrape-item');
        const title = document.getElementById('add-rss-scrape-title');
        const link = document.getElementById('add-rss-scrape-link');
        const desc = document.getElementById('add-rss-scrape-desc');
        if (!item.value.trim() || !title.value.trim() || !link.value.trim()) {
          return alert('Please fill in item, title, and link selectors for scrape mode.');
        }
        feedType = 'scrape';
        scrape = {
          item: item.value.trim(),
          title: title.value.trim(),
          link: link.value.trim(),
          description: desc.value.trim() || undefined
        };
      }

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url, feedType, scrape, guildId: currentGuildId })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          if (nameInput) nameInput.value = '';
          if (urlInput) urlInput.value = '';
          if (scrapeChk) scrapeChk.checked = false;
          toggleScrapeFields('rss');
          renderCategoryFeeds('rss');
        } else {
          alert(data.error || 'Failed to add feed');
        }
      } catch (err) {
        alert('Network error adding feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // Reddit
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

    async function submitAddRedditFeed() {
      if (!currentGuildId) return;
      const subInput = document.getElementById('add-reddit-sub');
      const nameInput = document.getElementById('add-reddit-name');
      const imageModeChk = document.getElementById('add-reddit-image-mode');
      const rawSub = subInput ? subInput.value.trim() : '';
      if (!rawSub) return alert('Please enter a subreddit name.');
      const cleanSub = cleanSubredditName(rawSub);
      const url = 'https://www.reddit.com/r/' + cleanSub + '/.rss';
      const feedType = imageModeChk && imageModeChk.checked ? 'reddit' : 'rss';
      const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Reddit · r/' + cleanSub;

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url, feedType, guildId: currentGuildId })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          if (subInput) subInput.value = '';
          if (nameInput) nameInput.value = '';
          renderCategoryFeeds('reddit');
        } else {
          alert(data.error || 'Failed to add Reddit feed');
        }
      } catch (err) {
        alert('Network error adding Reddit feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // Free Games
    const FREEGAMES_PLATFORMS = [
      { key: 'all', name: 'Free Games · All Stores' },
      { key: 'epic', name: 'Free Games · Epic Games Store' },
      { key: 'steam', name: 'Free Games · Steam Giveaways' },
      { key: 'gog', name: 'Free Games · GOG Promotions' },
      { key: 'indiegala', name: 'Free Games · IndieGala Freebies' },
      { key: 'humble', name: 'Free Games · Humble Bundle' },
      { key: 'itchio', name: 'Free Games · Itch.io Freebies' },
      { key: 'ubisoft', name: 'Free Games · Ubisoft Giveaways' },
      { key: 'prime', name: 'Free Games · Prime Gaming' }
    ];

    function handleFreeGamesPlatformChange(val) {
      const nameInput = document.getElementById('add-freegames-name');
      if (!nameInput) return;
      const found = FREEGAMES_PLATFORMS.find(p => p.key === val);
      if (found && (!nameInput.value || nameInput.value.startsWith('Free Games ·'))) {
        nameInput.placeholder = found.name;
      }
    }

    async function submitAddFreeGamesFeed() {
      if (!currentGuildId) return;
      const platSelect = document.getElementById('add-freegames-platform');
      const nameInput = document.getElementById('add-freegames-name');
      const platformKey = platSelect ? platSelect.value : 'all';
      let name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        const found = FREEGAMES_PLATFORMS.find(p => p.key === platformKey);
        name = found ? found.name : 'Free Games · All Stores';
      }
      const feedType = platformKey === 'all' ? 'free_games' : ('free_games_' + platformKey);
      const url = 'freegames://' + platformKey;

      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url, feedType, guildId: currentGuildId })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          if (nameInput) nameInput.value = '';
          renderCategoryFeeds('freegames');
        } else {
          alert(data.error || 'Failed to add Free Games feed');
        }
      } catch (err) {
        alert('Network error adding Free Games feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // TAB 4: NEWS FEEDS
    async function loadNewsTab() {
      const container = document.getElementById('presets-list-container');
      if (!container) return;
      container.innerHTML = '<div class="empty-state">Loading news feeds catalog...</div>';
      try {
        const res = await fetch('/api/presets', { signal: AbortSignal.timeout(6000) });
        if (!res.ok) {
          container.innerHTML = '<div class="empty-state">Could not load news feeds catalog.</div>';
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
              : '<span class="badge badge-amber">Preset</span>';
            const btnHtml = p.alreadyAdded
              ? '<button disabled class="btn btn-ghost btn-sm" style="opacity: 0.6; cursor: default;"><i class="fa-solid fa-check"></i> Added</button>'
              : '<button data-preset-id="' + esc(p.id) + '" onclick="enablePreset(this.dataset.presetId)" class="btn btn-primary btn-sm"><i class="fa-solid fa-bolt"></i> Enable</button>';

            itemsHtml += '<div class="feed-pill">' +
              '<div class="feed-details">' +
                '<div class="feed-name-row">' +
                  '<span class="feed-name">' + esc(p.name) + '</span>' +
                  addedBadge +
                '</div>' +
                '<div style="font-size: 0.8125rem; color: var(--text-muted);">' + esc(p.description) + '</div>' +
                '<div class="feed-url">' + esc(p.url) + '</div>' +
              '</div>' +
              '<div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">' +
                btnHtml +
              '</div>' +
            '</div>';
          }

          fullHtml += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">' +
            '<div style="font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; color: var(--amber); display: flex; align-items: center; gap: 0.375rem;"><i class="fa-solid fa-folder-open"></i> ' + esc(cat) + '</div>' +
            '<div class="feed-list">' + itemsHtml + '</div>' +
          '</div>';
        }

        container.innerHTML = fullHtml;
      } catch {
        container.innerHTML = '<div class="empty-state">Failed to load news feeds catalog.</div>';
      }
    }

    async function enablePreset(presetId) {
      if (!currentGuildId) return;
      const preset = cachedPresets.find(p => p.id === presetId);
      if (!preset) return;
      if (!cachedCategories) {
        alert('Server configuration is still loading. Please wait a moment and try again.');
        return;
      }
      const rssTarget = (cachedCategories.categories || []).find(t => t.category === 'rss');
      if (!rssTarget || !rssTarget.channelId) {
        alert('Please configure an RSS target channel for this server in the Categories tab before subscribing to news presets.');
        return;
      }
      try {
        const res = await fetch('/api/feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: preset.name, url: preset.url, feedType: 'rss', guildId: currentGuildId })
        });
        if (!checkAuth(res)) return;
        const data = await res.json();
        if (res.ok) {
          alert('Enabled "' + preset.name + '".');
          loadNewsTab();
        } else {
          alert(data.error || 'Failed to enable feed');
        }
      } catch (err) {
        alert('Network error enabling feed: ' + (err && err.message ? err.message : String(err)));
      }
    }

    // TAB 5: SETTINGS (ADMIN)
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

          return '<div class="feed-pill">' +
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

    // TAB 6: DEVELOPER TOOLS
    async function loadDevToolsTab() {
      renderActivityLogs();
      try {
        const res = await fetch('/api/admin/stats', { signal: AbortSignal.timeout(5000) });
        if (!checkAuth(res)) return;
        const stats = await res.json();
        const set = (id, v) => {
          const el = document.getElementById(id);
          if (el) el.textContent = v;
        };
        set('dt-feed-count', stats.feedCount ?? '-');
        set('dt-sent-count', stats.sentCount ?? '-');
        set('dt-user-count', stats.userCount ?? '-');
        set('dt-db-size', Math.round((stats.dbSizeBytes || 0) / 1024) + ' KB');
        if (typeof stats.processUptimeSeconds === 'number') {
          const s = stats.processUptimeSeconds;
          const d = Math.floor(s / 86400);
          const h = Math.floor((s % 86400) / 3600);
          const m = Math.floor((s % 3600) / 60);
          set('dt-uptime', (d ? d + 'd ' : '') + h + 'h ' + m + 'm');
        }
        set('dt-memory', Math.round(stats.memoryRssBytes / 1048576) + ' MB');
        set('dt-heap', Math.round(stats.memoryHeapUsedBytes / 1048576) + ' MB');
        set('dt-node', stats.nodeVersion || '-');
        set('dt-platform', stats.platform || '-');
      } catch {}
    }

    async function renderActivityLogs() {
      const container = document.getElementById('devtools-logs');
      if (!container) return;
      const levelEl = document.getElementById('devtools-log-level');
      const limitEl = document.getElementById('devtools-log-limit');
      const level = levelEl ? levelEl.value : '';
      const limit = limitEl ? limitEl.value : '100';
      try {
        container.innerHTML = '<div class="empty-state">Loading service logs...</div>';
        const res = await fetch(
          '/api/admin/activity?limit=' + encodeURIComponent(limit) + (level ? '&level=' + encodeURIComponent(level) : ''),
          { signal: AbortSignal.timeout(5000) }
        );
        if (!checkAuth(res)) return;
        const logs = await res.json();
        if (!Array.isArray(logs) || !logs.length) {
          container.innerHTML = '<div class="empty-state">No log entries found.</div>';
          return;
        }
        container.innerHTML = logs.map(a => {
          const lvl = (a.level || 'info').toLowerCase();
          const badge = lvl === 'error' ? 'badge-red' : lvl === 'warn' ? 'badge-amber' : lvl === 'info' ? 'badge-green' : 'badge-gray';
          const time = a.ts ? new Date(a.ts).toLocaleString() : '-';
          const actor = a.userId != null ? 'User #' + a.userId : 'System';
          return '<div class="feed-pill" style="align-items: flex-start;">' +
            '<div class="feed-details">' +
              '<div class="feed-name-row">' +
                '<span class="badge ' + badge + '">' + esc(lvl) + '</span>' +
                '<span class="badge badge-gray">' + esc(a.source || 'system') + '</span>' +
                '<span class="feed-name" style="font-weight: 600; font-size: 0.8125rem;">' + esc(a.message || '') + '</span>' +
              '</div>' +
              '<div class="feed-meta">' + esc(time) + ' &middot; Actor: ' + esc(actor) + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch {
        if (container) container.innerHTML = '<div class="empty-state">Failed to load service logs.</div>';
      }
    }

    async function postDevToolAction(url, okMsg, failMsg) {
      try {
        const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(15000) });
        if (!checkAuth(res)) return;
        if (res.ok) {
          alert(okMsg);
          renderActivityLogs();
        } else {
          let msg = failMsg;
          try {
            const j = await res.json();
            if (j && j.error) msg += ': ' + j.error;
          } catch {}
          alert(msg);
        }
      } catch {
        alert(failMsg);
      }
    }

    function syncDiscordCommands() {
      postDevToolAction('/api/admin/bot/sync-commands', 'Discord slash commands synced successfully.', 'Failed to sync Discord slash commands.');
    }

    function optimizeDatabase() {
      postDevToolAction('/api/admin/db/optimize', 'SQLite database optimized.', 'Failed to optimize the database.');
    }

    // Initialize on page load
    loadUserProfile();

    const urlParams = new URLSearchParams(window.location.search);
    const guildParam = urlParams.get('guild');
    const initialTab = urlParams.get('tab');

    if (guildParam) {
      currentGuildId = guildParam;
      loadGuildDashboard();
      if (initialTab && ['overview', 'categories', 'news', 'settings', 'devtools'].includes(initialTab)) {
        switchTab(initialTab);
      }
    } else {
      loadGuildSelection();
    }
  </script>
</body>
</html>`;
}
