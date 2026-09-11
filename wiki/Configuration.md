# Configuration Guide

HELIX RSS is configured primarily via environment variables loaded from `.env` in the repository root. The application natively reads this file on startup via Node 22 (`--env-file-if-exists=.env`).

---

## ⚙️ Environment Variables Reference

### Core Networking & Ports

| Variable       | Default     | Description                                                                                                                                                                                                                           |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_URL` | `127.0.0.1` | The internal bind address used by the Discord bot and web dashboard. Set to `0.0.0.0` to expose on your local network (LAN), or leave as `127.0.0.1` for local-only or reverse-proxy setups.                                    |
| `DISCORD_PORT` | `3131`      | The primary HTTP/HTTPS port for the Discord bot service, interaction endpoints, and OAuth flows. The web dashboard runs as a managed sub-process incremented from this port (e.g. `3132`).                                         |
| `REDIS_PORT`   | `3535`      | The port for the Redis coordinator. Redis automatically binds to `INTERNAL_URL`.                                                                                                                                                      |
| `CUSTOM_URL`   | _(empty)_   | **Recommended for Cloud Hosting**. Binds your custom domain (e.g., `https://rss.example.com`) to dynamic cloud host domains (Render, Railway, Fly.io). Overrides dynamic host URLs so Discord OAuth callbacks, invite links, and bot embeds stay stable. |
| `PUBLIC_URL`   | _(empty)_   | **Optional**. Fallback alias for `CUSTOM_URL`. When provided, public-facing links, Discord bot invite links, and OAuth redirect URIs will use this URL instead of the internal address.                                             |

### Feed Polling & Timeouts

Feed posting intervals are managed directly per-user via the dashboard **Feeds** tab using preset buttons (`1 min`, `10 min`, `30 min`, `1 hour`), removing the need for environment variables or calculating milliseconds.

| Variable             | Default | Description                                                                                                   |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `REQUEST_TIMEOUT_MS` | `15000` | Timeout in milliseconds for outgoing HTTP requests (fetching feeds, scraping web pages, delivering messages). |

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

### Native SSL & HTTPS Proxy (Optional)

| Variable              | Default   | Description                                                                                             |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `SITE_SSL_KEY`        | _(empty)_ | File path to a PEM-formatted private key or raw PEM string for native HTTPS.                            |
| `SITE_SSL_CERT`       | _(empty)_ | File path to a PEM-formatted certificate file or raw PEM string for native HTTPS.                       |
| `HTTPS_PORT`          | `3443`    | Port for the built-in HTTPS proxy. If no SSL certs are configured, generates an in-memory self-signed TLS cert on boot. |
| `ENABLE_HTTPS_PROXY`  | `false`   | Set to `true` to force-enable the HTTPS proxy when `HTTPS_PORT` is not set explicitly.                  |

### Keep-Alive Network Ping (Optional)

| Variable           | Default          | Description                                                                                                                                                                                            |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PING_URL`         | _(auto-derived)_ | Health endpoint to ping periodically to prevent cloud spindown / throttling. Automatically derived from `INTERNAL_URL` (host) and `DISCORD_PORT` (e.g. `http://${INTERNAL_URL}:${DISCORD_PORT}/health`). Override with an external URL or set to `disabled` to turn off. |
| `PING_INTERVAL_MS` | `600000`         | Interval in milliseconds between keep-alive pings (default 10 minutes).                                                                                                                                |

---

## 🛡️ Preflight Port Clearing & In-Memory Coordination

To eliminate port-in-use errors (`EADDRINUSE`) when restarting or updating:

1. **Preflight Port Sweep**: On boot, HELIX RSS scans `DISCORD_PORT` (3131) and port aliases. If an inactive or orphaned process is lingering on these ports from a prior session, it is cleanly terminated before binding.
2. **In-Memory Redis Coordination**: Powered by `ioredis-mock`, eliminating any requirement for an external `redis-server` binary. The application boots instantly anywhere with standard `npm install` and `npm start`.
