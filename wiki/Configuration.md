# ⚙️ Configuration & Environment Variables

HELIX RSS is configured entirely via environment variables defined in a `.env` file at the root of the project. The service reads it automatically on `npm start` (`node --env-file-if-exists=.env`).

> **Note**: Because the service is self-hosted, there is **no in-dashboard credential editor**. All secrets and settings live in `.env` only — see [Rule 00](../AGENTS.md) for the safety contract.

---

## 📋 Complete Environment Variable Reference

### 🤖 Discord Bot Configuration

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DISCORD_TOKEN` | For bot | — | Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications). The bot starts automatically when set. |
| `DISCORD_CLIENT_ID` | For login | — | Discord Application Client ID. |
| `DISCORD_CLIENT_SECRET` | For login | — | Discord OAuth2 Client Secret used for dashboard authentication. |
| `DISCORD_REDIRECT_URL` | No | Auto-built invite URL | Bot Invite / Authorization URL shown in the dashboard header and Dev Tools. |
| `DISCORD_CALLBACK_URL` | No | `http://<host>:<port>/api/auth/callback/discord` | OAuth2 redirect callback URI. Must match the Developer Portal entry exactly. |
| `DISCORD_API_BASE_URL` | No | `https://discord.com/api/v10` | Override the Discord REST API base URL (e.g. for a self-hosted Discord API proxy). |

### 🌐 Networking & Ports

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `INTERNAL_URL` | No | `127.0.0.1:3131` | Bind host and port for both the web dashboard and the Discord bot endpoints (e.g. `127.0.0.1:3131` or `0.0.0.0:3131`). |
| `DISCORD_PORT` | No | `3131` | Port override used when `INTERNAL_URL` does not include a port. |
| `HOST` | No | `127.0.0.1` | Host override when `INTERNAL_URL` does not specify one. |
| `PUBLIC_URL` | No | — | Public URL of the instance when accessed via a domain/reverse proxy (e.g. `https://rss.yourdomain.com`). Used to build OAuth callbacks. Aliases: `CUSTOM_URL`, `CUSTOM_DOMAIN`. |

> ℹ️ The old Express-era `PORT` / `PUBLIC_BASE_URL` variables have been retired in favor of `INTERNAL_URL` / `DISCORD_PORT` and `PUBLIC_URL`.

### 📦 Repository & User-Agent Identification

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `REPO_URL` | No | — | Repository URL used in Discord REST requests, feed fetchers, and dashboard "GitHub" links. Aliases: `GITHUB_REPO`, `REPOSITORY_URL`, `PROJECT_URL`. |
| `USER_AGENT` | No | `DiscordBot (<REPO_URL>, 0.1.0)` | Custom HTTP User-Agent sent with outgoing requests. Alias: `DISCORD_USER_AGENT`. |

### 🗂️ Logging & Timeouts

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `LOG_LEVEL` | No | `info` | `debug` \| `info` \| `warn` \| `error`. |
| `REQUEST_TIMEOUT_MS` | No | `15000` | HTTP request timeout for fetching remote feeds (milliseconds). |

### 💾 Persistence

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SQLITE_DATA` | No | `./data` | Directory that stores the `helix-rss.db` SQLite file (native `node:sqlite`, WAL mode). |

> SQLite is the only supported database engine; there is no PostgreSQL/MySQL support.

### 🔐 Native SSL / HTTPS (Optional)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SITE_SSL_KEY` / `SITE_SSL_CERT` | No | — | Paths (or PEM contents) for native HTTPS on the web dashboard. |
| `DISCORD_SSL_KEY` / `DISCORD_SSL_CERT` | No | Falls back to `SITE_SSL_*` | HTTPS certificates for the Discord bot endpoint. |

### 💓 Keep-Alive Network Ping (Optional)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PING_ENABLED` | No | `true` | Set to `false` to disable keep-alive pings. Aliases: `KEEP_ALIVE`, `KEEP_ALIVE_ENABLED`. |
| `PING_URL` | No | `http://<host>:<port>/health` | URL to ping periodically. Accepts `INTERNAL_URL` / `DISCORD_PORT` placeholders. Alias: `KEEP_ALIVE_URL`. |
| `PING_INTERVAL_MS` | No | `600000` | Ping frequency in milliseconds (default 10 minutes). |

### 🎨 Dashboard Appearance

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DASHBOARD_THEME` | No | `dark` | `glassmorphism` \| `dark` \| `light` \| `cyberpunk` \| `dracula` \| `nord` \| `emerald`. Aliases: `DEFAULT_THEME`, `THEME`. |
| `DASHBOARD_COLOR_SCHEME` | No | `default` | Accent palette for any theme: `default` \| `cyan` \| `purple` \| `blue` \| `emerald` \| `rose` \| `amber` \| `indigo` \| `crimson` \| `teal` \| `sunset`. Aliases: `COLOR_SCHEME`, `ACCENT_COLOR`. |
| `LANDING_PAGE_ENABLED` | No | `true` | Set to `false` to disable the landing page at `/` and redirect straight to `/dashboard`. Alias: `ENABLE_LANDING_PAGE`. |

---

## ⏱️ Feed Polling & Delivery Intervals

Feed polling intervals are **user-configurable** from the dashboard (Feeds tab) rather than via environment variables, and are persisted per user:

- `1 minute`, `10 minutes`, `30 minutes`, or `1 hour` per feed subscription.
- A global fallback of `1 hour` is used unless overridden (`poll_interval_ms` app setting).

---

## 📝 Sample `.env` Template

Start from the repository's `.env.example`:

```env
# Internal bind address and port
INTERNAL_URL=127.0.0.1:3131

# Public URL (domain / reverse proxy)
PUBLIC_URL=http://localhost:3131

# Repository & User-Agent identification
REPO_URL=https://github.com/HELIX-Origin/HELIX-RSS
USER_AGENT=

# Logging
LOG_LEVEL=info

# Request timeout for remote feeds
REQUEST_TIMEOUT_MS=15000

# SQLite data directory
SQLITE_DATA=./data

# Discord Bot credentials (bot starts when DISCORD_TOKEN is set)
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Bot Invite / Authorization URL
DISCORD_REDIRECT_URL=https://discord.com/oauth2/authorize?client_id=your_client_id&permissions=8&integration_type=0&scope=bot+applications.commands

# Optional: Native SSL certificates
SITE_SSL_KEY=
SITE_SSL_CERT=

# Optional: Keep-Alive ping
PING_INTERVAL_MS=600000

# Optional: Dashboard theme & landing page
DASHBOARD_THEME=dark
DASHBOARD_COLOR_SCHEME=default
LANDING_PAGE_ENABLED=true
```