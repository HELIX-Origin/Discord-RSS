import type { AppDeps } from '../../app.js';
import { getThemeInfo, getColorSchemeInfo } from './dashboard.js';

export function renderLandingHtml(deps: AppDeps, userId: number | null = null): string {
  const appName = deps.bot?.getAppName() || 'HELIX RSS';
  const appIconUrl = deps.bot?.getAppIconUrl() || null;
  const theme = getThemeInfo(deps.config.defaultTheme);
  const colorScheme = getColorSchemeInfo(deps.config.dashboardColorScheme);
  const botInviteUrl = deps.config.clientId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(deps.config.clientId)}&scope=bot%20applications.commands&permissions=534723950656`
    : null;
  const repoUrl = deps.config.repoUrl || 'https://github.com/HELIX-Origin/HELIX-RSS';
  const dbStats = deps.db.stats();

  return `<!DOCTYPE html>
<html lang="en" class="${theme.id} scheme-${colorScheme.id}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} · Modern RSS &amp; Content Syndication for Discord</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <meta name="description" content="High-performance RSS, Reddit, YouTube, TikTok, and Free Games giveaway syndication bot with rich embeds and real-time dashboard for Discord.">
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
      background: radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.18), transparent 35%),
                  radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.18), transparent 35%),
                  radial-gradient(circle at 50% 85%, rgba(236, 72, 153, 0.15), transparent 45%),
                  #0a0d18;
      background-attachment: fixed;
    }
    html.glassmorphism .card,
    html.glassmorphism header,
    html.glassmorphism .hero-banner {
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
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

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; line-height: 1.6; }
    
    /* Header */
    header { position: sticky; top: 0; z-index: 50; background: var(--card-bg); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); padding: 0.875rem 2rem; display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--text); }
    .brand-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: linear-gradient(135deg, #06b6d4, #3b82f6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(6,182,212,0.3); }
    .brand-title { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; }
    .brand-title span { color: var(--primary); }
    .nav-actions { display: flex; align-items: center; gap: 0.75rem; }

    /* Container */
    .container { max-width: 1200px; width: 100%; margin: 0 auto; padding: 3rem 1.5rem; display: flex; flex-direction: column; gap: 4rem; flex: 1; }

    /* Hero Section */
    .hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; max-width: 860px; margin: 0 auto; }
    .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.85rem; border-radius: 2rem; background: var(--primary-bg); border: 1px solid var(--primary-border); color: var(--primary); font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .hero-title { font-size: 3rem; font-weight: 900; line-height: 1.15; letter-spacing: -0.03em; }
    .hero-title span { color: var(--primary); background: linear-gradient(135deg, var(--primary), #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-subtitle { font-size: 1.125rem; color: var(--text-muted); max-width: 680px; }
    .hero-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin-top: 1rem; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.875rem; font-size: 0.9375rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: all 0.15s; border: 1px solid transparent; }
    .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 6px 20px rgba(6,182,212,0.3); }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); }
    .btn-discord { background: var(--discord); color: #fff; box-shadow: 0 6px 20px rgba(88,101,242,0.3); }
    .btn-discord:hover { background: var(--discord-hover); transform: translateY(-2px); }
    .btn-outline { background: var(--card-inner); color: var(--text); border-color: var(--border); }
    .btn-outline:hover { border-color: var(--primary); color: var(--primary); }
    .btn-sm { padding: 0.4rem 0.85rem; font-size: 0.8125rem; border-radius: 0.625rem; }

    /* Stats Ribbon */
    .stats-ribbon { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; }
    .stat-box { background: var(--card-bg); border: 1px solid var(--border); border-radius: 1.25rem; padding: 1.5rem; text-align: center; backdrop-filter: blur(12px); }
    .stat-number { font-size: 2.25rem; font-weight: 900; color: var(--primary); }
    .stat-label { font-size: 0.875rem; font-weight: 600; color: var(--text-muted); margin-top: 0.25rem; }

    /* Features Grid */
    .features-section { display: flex; flex-direction: column; gap: 2rem; }
    .section-header { text-align: center; }
    .section-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
    .section-subtitle { font-size: 1rem; color: var(--text-muted); margin-top: 0.5rem; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    .feature-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 1.25rem; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; backdrop-filter: blur(12px); transition: transform 0.2s, border-color 0.2s; }
    .feature-card:hover { transform: translateY(-4px); border-color: var(--primary-border); }
    .feature-icon { width: 3.25rem; height: 3.25rem; border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; }
    .feature-title { font-size: 1.25rem; font-weight: 700; color: var(--text); }
    .feature-desc { font-size: 0.875rem; color: var(--text-muted); line-height: 1.6; }

    /* Sources Pill Grid */
    .sources-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: 1rem; }
    .source-pill { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.125rem; border-radius: 2rem; background: var(--card-inner); border: 1px solid var(--border); font-size: 0.875rem; font-weight: 600; color: var(--text); }
    .source-pill i { font-size: 1rem; }

    /* Quick Command Showcase */
    .code-preview { background: var(--card-inner); border: 1px solid var(--border); border-radius: 1.25rem; padding: 2rem; font-family: monospace; display: flex; flex-direction: column; gap: 0.75rem; }
    .code-line { display: flex; align-items: center; gap: 1rem; font-size: 0.9375rem; }
    .code-cmd { color: var(--primary); font-weight: bold; }
    .code-comment { color: var(--text-dim); }

    /* Footer */
    footer { background: var(--card-bg); border-top: 1px solid var(--border); padding: 2rem; text-align: center; font-size: 0.875rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.75rem; }
    .footer-links { display: flex; justify-content: center; gap: 1.5rem; }
    .footer-links a { color: var(--text-muted); text-decoration: none; }
    .footer-links a:hover { color: var(--primary); }
    .badge-gray { background: rgba(156,163,175,0.12); color: #9ca3af; border: 1px solid var(--border); padding: 0.35rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; }
  </style>
</head>
<body>
  <!-- Navigation Header -->
  <header>
    <a href="/" class="brand">
      ${
        appIconUrl
          ? `<img src="${appIconUrl}" alt="${appName}" style="width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; object-fit: cover;">`
          : `<div class="brand-icon"><i class="fa-solid fa-rss"></i></div>`
      }
      <div class="brand-title">${appName}</div>
    </a>

    <div class="nav-actions">
      <span class="badge-gray" title="Active Theme: ${theme.name}">
        <i class="${theme.icon}" style="color: var(--primary); margin-right: 0.25rem;"></i> ${theme.name}
      </span>
      ${
        botInviteUrl
          ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-discord btn-sm">
        <i class="fa-brands fa-discord"></i> Invite Bot
      </a>`
          : ''
      }
      <a href="/dashboard" class="btn btn-primary btn-sm">
        <i class="fa-solid fa-gauge"></i> Open Dashboard
      </a>
    </div>
  </header>

  <!-- Main Content -->
  <div class="container">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-badge"><i class="fa-solid fa-bolt"></i> Ultimate Content Syndication Engine</div>
      <h1 class="hero-title">Automate News, Media &amp; Giveaways directly into <span>Discord</span></h1>
      <p class="hero-subtitle">
        Supercharge your community with real-time RSS/Atom updates, 100% free PC game giveaways, Reddit pure image feeds, YouTube video drops, and 700+ curated news presets.
      </p>

      <div class="hero-cta">
        ${
          botInviteUrl
            ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-discord">
          <i class="fa-brands fa-discord"></i> Add to Discord
        </a>`
            : ''
        }
        <a href="/dashboard" class="btn btn-primary">
          <i class="fa-solid fa-gauge"></i> Launch Web Dashboard
        </a>
        <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
          <i class="fa-brands fa-github"></i> View GitHub Wiki
        </a>
      </div>
    </section>

    <!-- Stats Ribbon -->
    <div class="stats-ribbon">
      <div class="stat-box">
        <div class="stat-number">700+</div>
        <div class="stat-label">Verified News Feeds</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">10</div>
        <div class="stat-label">Free Game Storefronts</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">&lt; 1s</div>
        <div class="stat-label">Direct Discord Delivery</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${Math.round(dbStats.dbSizeBytes / 1024)} KB</div>
        <div class="stat-label">Optimized Storage Engine</div>
      </div>
    </div>

    <!-- Supported Sources Ribbon -->
    <div style="text-align: center;">
      <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-muted);">Supported Platforms &amp; Protocols</h3>
      <div class="sources-grid">
        <div class="source-pill"><i class="fa-solid fa-rss" style="color: #f59e0b;"></i> RSS 2.0 &amp; Atom</div>
        <div class="source-pill"><i class="fa-brands fa-reddit" style="color: #ff4500;"></i> Reddit (Pure Image &amp; RSS)</div>
        <div class="source-pill"><i class="fa-solid fa-gamepad" style="color: #10b981;"></i> Epic Games Store &amp; Steam</div>
        <div class="source-pill"><i class="fa-brands fa-youtube" style="color: #ef4444;"></i> YouTube Channels</div>
        <div class="source-pill"><i class="fa-solid fa-cloud" style="color: #38bdf8;"></i> Bluesky AT Protocol</div>
        <div class="source-pill"><i class="fa-brands fa-tiktok" style="color: #ec4899;"></i> TikTok Creators</div>
        <div class="source-pill"><i class="fa-solid fa-gifts" style="color: #a855f7;"></i> GOG, Prime &amp; Humble Bundle</div>
      </div>
    </div>

    <!-- Core Features Grid -->
    <section class="features-section">
      <div class="section-header">
        <h2 class="section-title">Engineered for Community Power</h2>
        <p class="section-subtitle">Zero webhook maintenance, granular role pings, and rich responsive aesthetics.</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">
            <i class="fa-solid fa-rss"></i>
          </div>
          <h3 class="feature-title">Fast Multi-Format Ingestion</h3>
          <p class="feature-desc">
            Conditional HTTP caching with ETag matching, composite 3-tier deduplication, and malformed XML cleaning ensure fast, duplicate-free notifications.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">
            <i class="fa-solid fa-gift"></i>
          </div>
          <h3 class="feature-title">Multi-Platform Free Games</h3>
          <p class="feature-desc">
            Aggregates 100% discount promotions across Epic Games, Steam, GOG, and Humble Bundle. Automated weekly Monday cron schedule plus manual poll triggers.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(255, 69, 0, 0.15); color: #ff4500;">
            <i class="fa-brands fa-reddit"></i>
          </div>
          <h3 class="feature-title">Reddit Pure Image Mode</h3>
          <p class="feature-desc">
            Automatically extracts high-resolution banners, gallery slides, and animated GIFs for wallpaper and meme channels, or switch to Standard RSS mode for discussions.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">
            <i class="fa-solid fa-newspaper"></i>
          </div>
          <h3 class="feature-title">700+ Curated News Feeds</h3>
          <p class="feature-desc">
            Browse and subscribe in 1 click across 15 categories including Technology, AI, Gaming, Science, Hardware, Linux, Anime, and Cybersecurity.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(88, 101, 242, 0.15); color: #5865F2;">
            <i class="fa-brands fa-discord"></i>
          </div>
          <h3 class="feature-title">Direct Discord REST Delivery</h3>
          <p class="feature-desc">
            No messy webhooks to create or regenerate. The bot posts directly to channels with role pings, custom embed colors, and store branding badges.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: rgba(168, 85, 247, 0.15); color: #a855f7;">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <h3 class="feature-title">Multi-Theme Customization</h3>
          <p class="feature-desc">
            Styled with modern Glassmorphism, Dark, Cyberpunk, Dracula, Nord, Emerald, or Light themes configured via environment variables.
          </p>
        </div>
      </div>
    </section>

    <!-- Slash Commands Showcase -->
    <section class="features-section">
      <div class="section-header">
        <h2 class="section-title">Intuitive Discord Slash Commands</h2>
        <p class="section-subtitle">Manage everything from inside Discord or through the web dashboard.</p>
      </div>

      <div class="code-preview">
        <div class="code-line">
          <span class="code-cmd">/feed add url:&lt;feed_url&gt; channel:#announcements role:@NewsPings</span>
          <span class="code-comment"># Subscribe channel to any RSS or Reddit feed</span>
        </div>
        <div class="code-line">
          <span class="code-cmd">/feed add url:freegames:all channel:#free-games</span>
          <span class="code-comment"># Subscribe to 100% free game promotions across all stores</span>
        </div>
        <div class="code-line">
          <span class="code-cmd">/feed test id:&lt;feed_id&gt;</span>
          <span class="code-comment"># Dispatch an instant preview embed to verify permissions</span>
        </div>
        <div class="code-line">
          <span class="code-cmd">/stats</span>
          <span class="code-comment"># View bot delivery metrics and server uptime</span>
        </div>
      </div>
    </section>
  </div>

  <!-- Footer -->
  <footer>
    <div class="footer-links">
      <a href="/dashboard">Web Dashboard</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/tos">Terms of Service</a>
      <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
    </div>
    <div>&copy; ${new Date().getFullYear()} ${appName} &bull; Powered by TypeScript, Express, Discord.js &amp; SQLite/PostgreSQL</div>
  </footer>
</body>
</html>`;
}
