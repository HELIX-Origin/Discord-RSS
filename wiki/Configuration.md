# Configuration Guide

HELIX RSS is configured primarily via environment variables loaded from `.env` in the repository root. The application natively reads this file on startup via Node 22 (`--env-file-if-exists=.env`).

---

## ⚙️ Environment Variables Reference

### Core Networking & Ports

| Variable       | Default          | Description                                                                                                                                                                                                                           |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_URL` | `127.0.0.1:3131` | The internal bind address and port used by the Discord bot and web dashboard. Specify host and optional port (e.g. `127.0.0.1:3131`, `0.0.0.0:3131`, or `127.0.0.1`). Defaults to host `127.0.0.1` and port `3131`.                                    |
| `PUBLIC_URL`   | _(empty)_        | **Public URL**. Custom public URL for the service when accessed behind an external reverse proxy (Cloudflare, Nginx, Apache) or native SSL (e.g. `https://your-domain.com` or `https://rss.example.com`). Used for generating OAuth redirect callbacks and public resource links. |

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

### Discord Bot & OAuth Authentication

| Variable                 | Default          | Description                                                                                                                                                                      |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`          | _(required)_     | Discord Bot Token from the Discord Developer Portal. Automatically launches the bot on startup.                                                                                  |
| `DISCORD_CLIENT_ID`      | _(required)_     | Discord Application Client ID.                                                                                                                                                   |
| `DISCORD_CLIENT_SECRET`  | _(required)_     | Discord Application Client Secret used for OAuth2 login.                                                                                                                         |
| `DISCORD_REDIRECT_URL`  | _(auto-derived)_ | The Bot Invite & Authorization URL. Format: `https://discord.com/oauth2/authorize?client_id=<your_client_id>&permissions=8&integration_type=0&scope=bot+applications.commands` |

### Reverse Proxy & SSL (Optional)

| Variable              | Default   | Description                                                                                             |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `SITE_SSL_KEY`        | _(empty)_ | File path to a PEM-formatted private key or raw PEM string for direct native HTTPS without a reverse proxy. |
| `SITE_SSL_CERT`       | _(empty)_ | File path to a PEM-formatted certificate file or raw PEM string for direct native HTTPS without a reverse proxy. |

### Keep-Alive Network Ping (Optional)

The keep-alive ping endpoint defaults to `http://${INTERNAL_URL}/health`. You do not need to specify a ping URL in the environment.

| Variable           | Default   | Description                                                                                                                   |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PING_INTERVAL_MS` | `600000`  | Interval in milliseconds between keep-alive pings (default 10 minutes: 600,000ms).                                            |
| `PING_ENABLED`     | `true`    | Set to `false` (or `KEEP_ALIVE=false`) to disable keep-alive pings entirely.                                                  |

---

## 🛡️ Preflight Port Clearing & In-Memory Coordination

To eliminate port-in-use errors (`EADDRINUSE`) when restarting or updating:

1. **Preflight Port Sweep**: On boot, HELIX RSS scans `DISCORD_PORT` (3131) and port aliases. If an inactive or orphaned process is lingering on these ports from a prior session, it is cleanly terminated before binding.
2. **In-Memory Redis Coordination**: Powered by `ioredis-mock`, eliminating any requirement for an external `redis-server` binary. The application boots instantly anywhere with standard `npm install` and `npm start`.
