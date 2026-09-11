# HELIX RSS — Reproduction-Safe Runbook

This runbook walks a fresh Windows checkout through the full service flow: install, configure, run, add a feed, verify delivery, and reset state safely. Every step is idempotent and does not require external credentials beyond a Discord webhook URL.

## 1. Clone the repository

Prerequisites: Node.js **>= 22.9** (uses `node:sqlite` and `--env-file-if-exists`).

```bash
git clone https://github.com/HELIX-Origin/HELIX-RSS.git
cd HELIX-RSS
```

No runtime dependencies are required. `redis` is optional and only used for cross-instance coordination.

## 2. Set up `.env`

```bash
copy .env.example .env
```

Edit `.env` as needed. The defaults are safe for local use:

| Variable | Default | Meaning |
|---|---|---|
| `INTERNAL_URL` | `127.0.0.1` | Bind address for site + bot; `0.0.0.0` to expose on LAN |
| `PUBLIC_URL` | *(empty)* | Optional public domain for external access + OAuth redirect URIs |
| `SITE_PORT` | `3434` | Dashboard + API port |
| `DISCORD_PORT` | `3131` | Discord bot HTTP endpoint port |
| `POLL_INTERVAL_MS` | `60000` | Feed poll interval |
| `STATUS_INTERVAL_MS` | `30000` | Site monitor interval |
| `REQUEST_TIMEOUT_MS` | `15000` | HTTP request timeout |
| `SQLITE_DATA` | `./data` | SQLite + runtime data folder |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `REDIS_HOST` | *(empty)* | Optional Redis server hostname/IP |
| `REDIS_PORT` | `3535` | Redis server port |
| `DISCORD_TOKEN` | *(empty)* | Bot token — bot starts automatically when set |
| `DISCORD_CLIENT_ID` | *(empty)* | Discord application client ID |
| `DISCORD_REDIRECT_URL` | *(empty)* | Bot invite link (replace `your_client_id` with actual client ID) |

OAuth provider credentials are **not** env vars — they are stored in SQLite and managed from the dashboard **Integrations** tab.

## 3. Install, build, and start

```bash
npm install
npm run build
npm start
```

Open <http://127.0.0.1:3434>.

## 4. Register a user

1. Click **Register** (top right of the login page, or browse to `/register`).
2. Enter an email + password and submit.
3. You are signed in automatically and land on the dashboard Overview.

## 5. Add a webhook

1. Open the **Webhooks** tab.
2. Enter a name (e.g., `#announcements`) and the Discord webhook URL.
3. Click **Add Webhook**.
   - A webhook URL looks like `https://discord.com/api/webhooks/<id>/<token>`.
   - To create one: Discord server → Server Settings → Integrations → Webhooks → New Webhook.

## 6. Add a feed

1. Open the **Feeds** tab.
2. Enter a name, the RSS/Atom URL, and select the webhook you just added.
3. Click **Add Feed**.
   - Or open **Popular Feeds** and click **Enable** on a preset, then choose the webhook.

## 7. Trigger a poll (manual)

1. On the **Feeds** tab, click the **Poll now** action next to the feed.
   - This calls `POST /api/feeds/:id/poll`.
2. The watcher will also poll automatically every `POLL_INTERVAL_MS`.

## 8. Verify a Discord delivery

1. Confirm the webhook was delivered in the Discord channel tied to the webhook URL.
   - New items are posted as embeds titled like the feed's `<title>`.
2. Confirm the activity log on the dashboard **Overview** shows a `feed` source entry.
3. Polling the same feed again should **not** duplicate items (`sent_entries` dedupe).

## 9. Reset state safely

The service is stateless at the process level; all runtime data lives under `DATA` (default `./data/`).

```bash
# Stop the service (Ctrl+C), then:
rd /s /q data

# Start fresh:
npm run build
npm start
```

- Deleting `./data` removes users, feeds, webhooks, monitors, and OAuth connections. **Back it up first** if you need to keep data.
- To reset only one user's data, delete the matching rows from `data/discord-rss.db` using any SQLite tool, then restart the service so the in-memory `AppState` reloads.

## 10. Testing & linting

```bash
npm run check
```

Runs type-check, Prettier format-check, ESLint, and the Vitest suite. All tests live in `tests/`; no scratch scripts.

## Cloudflare OAuth (optional)

1. In the dashboard **Integrations** tab, enable **Cloudflare**.
2. Enter the Cloudflare OAuth app Client ID and Client Secret.
3. Set `PUBLIC_URL` to the public URL of this instance — it is used to build OAuth redirect URIs.
4. The integration is exercised via `npm run check` against a mocked token endpoint (no real Cloudflare credentials needed).

## Discord Bot & Slash Commands (optional)

1. Set `DISCORD_TOKEN` (Bot token from Discord Developer Portal) and `DISCORD_CLIENT_ID` (Application Client ID) in `.env`. The bot starts automatically when `DISCORD_TOKEN` is set.
2. Start the service (`npm start`). The bot registers global application slash commands on launch:
   - `/feed add <name> <url> [channel] [feed_type]` — adds a feed and automatically creates a channel webhook.
   - `/feed list` — lists configured feeds for the server.
   - `/feed remove <id_or_name>` — deletes a feed.
   - `/feed poll <id_or_name>` — triggers an immediate poll.
   - `/feed toggle <id_or_name> <enabled>` — enables or pauses feed polling.
   - `/webhook create <name> <channel>` — creates a Discord channel webhook.
   - `/webhook list` — lists webhooks.
   - `/monitor add <name> <url> [channel]` — adds website status monitor.
   - `/monitor list`, `/monitor remove`, `/monitor check` — manages monitors.
   - `/stats` — displays service statistics, uptime, database size, and bot invite link.
   - `/bind [email]` — links the Discord server with a web dashboard user account.
3. All operations made via slash commands are immediately synchronized with the web dashboard.