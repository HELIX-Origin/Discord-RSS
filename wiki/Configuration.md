# Configuration Guide

HELIX RSS is configured primarily via environment variables loaded from `.env` in the repository root. The application natively reads this file on startup via Node 22 (`--env-file-if-exists=.env`).

---

## ⚙️ Environment Variables Reference

### Core Networking & Ports

| Variable       | Default     | Description                                                                                                                                                                                                                           |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_URL` | `127.0.0.1` | The internal bind address used by both the web dashboard and the Discord bot HTTP server. Set to `0.0.0.0` to expose on your local network (LAN), or leave as `127.0.0.1` for local-only or reverse-proxy setups.                     |
| `SITE_PORT`    | `3434`      | The HTTP/HTTPS port for the web dashboard, REST API, and dev tools.                                                                                                                                                                   |
| `DISCORD_PORT` | `3131`      | The internal HTTP/HTTPS port used for Discord bot interaction webhooks and OAuth redirects.                                                                                                                                           |
| `REDIS_PORT`   | `3535`      | The port for the Redis coordinator. Redis automatically binds to `INTERNAL_URL`.                                                                                                                                                      |
| `PUBLIC_URL`   | _(empty)_   | **Optional**. The public domain where HELIX RSS is hosted (e.g., `https://rss.example.com`). When provided, public-facing links, Discord bot invite links, and OAuth redirect URIs will use this URL instead of the internal address. |

### Monitoring & Polling Timers

| Variable             | Default | Description                                                                                                                     |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POLL_INTERVAL_MS`   | `60000` | Feed polling frequency in milliseconds (default: 60 seconds). All active RSS/Atom and scraper feeds are polled on this cadence. |
| `STATUS_INTERVAL_MS` | `30000` | Site status health check frequency in milliseconds (default: 30 seconds).                                                       |
| `REQUEST_TIMEOUT_MS` | `15000` | Timeout in milliseconds for outgoing HTTP requests (fetching feeds, scraping web pages, sending webhooks).                      |

### Logging & Storage

| Variable           | Default       | Description                                                                                                                   |
| ------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`        | `info`        | Logging verbosity: `debug`, `info`, `warn`, or `error`. Structured JSON logs are emitted with timestamp, source, and context. |
| `SQLITE_DATA`      | `./data`      | Directory where the primary SQLite database (`helix-rss.db`) and runtime assets are saved.                                    |
| `SQLITE_TEST_DATA` | `./data/.tmp` | Directory used by Vitest integration tests for temporary SQLite instances.                                                    |

### Discord Bot & OAuth Authentication

| Variable                | Default          | Description                                                                                                                                                                    |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DISCORD_TOKEN`         | _(empty)_        | **Required for Bot**. The Discord Bot token obtained from the Discord Developer Portal under the **Bot** tab. The bot automatically activates whenever this token is present.  |
| `DISCORD_CLIENT_ID`     | _(empty)_        | **Required**. Your Discord Application Client ID found in the Discord Developer Portal under **General Information**.                                                          |
| `DISCORD_CLIENT_SECRET` | _(empty)_        | **Required for Web Login**. Your Discord Application Client Secret found in the Developer Portal under **OAuth2**. Used to authenticate users via Discord.                     |
| `DISCORD_REDIRECT_URL`  | _(auto-derived)_ | The Bot Invite & Authorization URL. Format: `https://discord.com/oauth2/authorize?client_id=<your_client_id>&permissions=8&integration_type=0&scope=bot+applications.commands` |

### Cloudflare Access OAuth (Optional)

| Variable                   | Default   | Description                                                                                                   |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_CLIENT_ID`     | _(empty)_ | **Optional**. OAuth Client ID for authenticating with Cloudflare Access to monitor protected feeds and sites. |
| `CLOUDFLARE_CLIENT_SECRET` | _(empty)_ | **Optional**. OAuth Client Secret for Cloudflare Access token exchanges. Can be omitted when using public / code-based OAuth authentication. |

### Native SSL / HTTPS (Optional)

| Variable        | Default   | Description                                                                       |
| --------------- | --------- | --------------------------------------------------------------------------------- |
| `SITE_SSL_KEY`  | _(empty)_ | File path to a PEM-formatted private key or raw PEM string for native HTTPS.      |
| `SITE_SSL_CERT` | _(empty)_ | File path to a PEM-formatted certificate file or raw PEM string for native HTTPS. |

---

## 🛡️ Preflight Port Clearing & Redis Lifecycle

To eliminate port-in-use errors (`EADDRINUSE`) when restarting or updating:

1. **Preflight Port Sweep**: On boot, HELIX RSS scans `SITE_PORT` (3434), `DISCORD_PORT` (3131), and `REDIS_PORT` (3535). If an inactive or orphaned process is lingering on these ports from a prior session, it is cleanly terminated before binding.
2. **Embedded Redis Lifecycle**: If `redis-server` is installed on your host, HELIX RSS will automatically launch it on `REDIS_PORT` (3535) and gracefully terminate it when the service stops. If Redis is not installed, the application seamlessly operates in standalone SQLite mode with zero delay.
