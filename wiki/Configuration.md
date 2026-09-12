# ⚙️ Configuration & Environment Variables

Discord-RSS is configured primarily via environment variables defined in a `.env` file at the root of the project.

---

## 📋 Complete Environment Variable Reference

### 🤖 Discord Bot Configuration

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DISCORD_TOKEN` | **Yes** | — | Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications). |
| `DISCORD_CLIENT_ID` | **Yes** | — | Discord Application Client ID. |
| `DISCORD_CLIENT_SECRET` | **Yes** | — | Discord OAuth2 Client Secret for dashboard authentication. |
| `DISCORD_CALLBACK_URL` | **Yes** | `http://localhost:3000/auth/discord/callback` | OAuth2 redirect callback URI. Must match Developer Portal. |
| `OWNER_IDS` | No | *(Auto-detected)* | Comma-separated Discord User IDs granted superadmin dashboard access. If omitted, fetched automatically via Discord API. |

---

### 🌐 Web Server & Dashboard Configuration

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3000` | HTTP port for the web dashboard and REST API. |
| `SESSION_SECRET` | **Yes** | — | Cryptographic salt used to sign Express session cookies. |
| `BASE_URL` | No | `http://localhost:3000` | Public root URL of the dashboard instance (used for OAuth redirects). |
| `TRUST_PROXY` | No | `false` | Enable (`true`) when running behind reverse proxies (Nginx, Traefik, Cloudflare). |

---

### 📡 Feed Engine & Polling Scheduler

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `POLL_INTERVAL` | No | `300` | Background polling loop interval (in seconds). Default is 5 minutes. |
| `FEED_CONCURRENCY` | No | `5` | Maximum number of feeds polled concurrently in worker pools. |
| `FEED_TIMEOUT` | No | `15000` | HTTP request timeout for fetching remote feeds (in milliseconds). |
| `MAX_ITEMS_PER_POLL` | No | `5` | Maximum new articles dispatched per feed per poll cycle to prevent spam. |
| `REDDIT_USER_AGENT` | No | `Discord-RSS/2.0` | Custom HTTP User-Agent string sent to Reddit endpoints to avoid 429 rate limits. |

---

### 🎮 Free Games & Giveaways Engine

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `FREE_GAMES_MIN_PRICE` | No | `0` | Minimum original retail price (in USD) for giveaways to be announced. |
| `FREE_GAMES_INCLUDE_LOOT` | No | `false` | Set to `true` to include DLCs, in-game currency, and cosmetic loot packs. |

---

### 💾 Database Configuration

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | No | `./data/discord-rss.sqlite` | SQLite file path (`./data/discord-rss.sqlite`) or PostgreSQL connection string (`postgres://user:pass@host:5432/dbname`). |
| `DB_MAX_CONNECTIONS` | No | `10` | Maximum database connection pool size (PostgreSQL). |

---

## 📝 Sample `.env` Template

```env
# Discord Bot Credentials
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback

# Web Dashboard
PORT=3000
SESSION_SECRET=super_secret_session_encryption_key_change_me
BASE_URL=http://localhost:3000
TRUST_PROXY=false

# Feed Scheduler
POLL_INTERVAL=300
FEED_CONCURRENCY=5
FEED_TIMEOUT=15000
MAX_ITEMS_PER_POLL=5
REDDIT_USER_AGENT=Discord-RSS/2.0 (by /u/YourUsername)

# Free Games Aggregator
FREE_GAMES_MIN_PRICE=0
FREE_GAMES_INCLUDE_LOOT=false

# Persistence
DATABASE_URL=./data/discord-rss.sqlite
```
