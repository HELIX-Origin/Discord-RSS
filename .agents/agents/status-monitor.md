# Status Monitor Agent

This agent defines conventions, architecture, and command references for the Discord RSS site status monitoring automation.

## Architecture & Structure

```
Discord RSS/
├── src/
│   ├── index.ts                        # Entry: boot config, db, repo, redis, watchers, server
│   ├── status/
│   │   └── watcher.ts                  # StatusWatcher (check, transition-only alerts) — THIS AGENT
│   ├── feed/
│   │   └── fetch.ts                    # fetchRaw shared (HTTP get + Cloudflare detection)
│   ├── state/
│   │   ├── app-state.ts                # AppState (in-memory primary layer)
│   │   └── redis.ts                    # RedisCoordinator (optional cross-instance locks)
│   ├── webhook/
│   │   └── discord.ts                  # Direct Discord webhook POST + retry, feedEmbed
│   └── scheduler/
│       └── scheduler.ts                # In-process interval scheduler
└── .agents/
    └── agents/
        └── status-monitor.md           # This file
```

## Setup & Workflow Commands

```bash
npm run build
npm start    # in-process scheduler drives status checks
```
- Status interval: `DISCORD_RSS_STATUS_INTERVAL_MS` (default 30s).

## Key Patterns

### 1. Availability Check (`src/status/watcher.ts`)
- Enumerate all enabled monitors from `repo.listMonitorsForAllUsers()`.
- For each: acquire a distributed poll lock via `RedisCoordinator` when Redis configured (`monitor:{id}`), else single-instance.
- `fetchRaw(monitor.url, { maxBytes: 512*1024 })`; classify by status code: `2xx-3xx` = online, else down. Timeout/exception = down.
- Cloudflare-protected monitors route through the shared fetch path.

### 2. Transition-Only Alerts
- Track previous status from the AppState monitor row.
- `repo.setMonitorChecked(userId, id, status)` always updates the row.
- Notify **only** on transition `unknown -> X` (skip) and `X -> Y` where X≠Y.
- False-positive suppression: fetch timeout/exception marks down; single retry behavior handled in `checkMonitorLocked`.

### 3. Webhook Delivery (`.env` Naming No Longer Applies)
- Monitors reference a per-user webhook row (`webhooks` table), dashboard-managed — never env vars.
- Embed via `feedEmbed(...)`: title `⛔ <name> went down` / `✅ <name> is back online`, color `0xef4444` / `0x22c55e`, description = `url\n\n<detail>`.
- `sendWebhook` from `src/webhook/discord.ts`.

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `DISCORD_RSS_STATUS_INTERVAL_MS` | Status check interval |
| `DISCORD_RSS_REDIS_URL` | Optional cross-instance coordination |

All other configuration (monitor targets, alert webhooks) is stored in SQLite and managed from the dashboard (Webhooks / Status Monitors tabs).