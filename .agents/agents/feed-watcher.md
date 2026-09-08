# Feed Watcher Agent

This agent defines conventions, architecture, and command references for the Discord RSS feed polling automation.

## Architecture & Structure

```
Discord RSS/
├── src/
│   ├── index.ts                        # Entry: boot config, db, repo, redis, watchers, server
│   ├── app.ts                          # AppDeps interface
│   ├── config.ts                       # Env parsing (DISCORD_RSS_*)
│   ├── server.ts                       # HTTP server assembly
│   ├── feed/
│   │   ├── fetch.ts                    # fetchRaw + Cloudflare challenge detection
│   │   ├── html.ts                     # HTML parsing
│   │   ├── parser.ts                   # RSS/Atom parsing, stripHtml, withGuid, FeedEntry
│   │   ├── xml.ts                       # XML helpers
│   │   ├── scraper.ts                  # HTML item scraping (scrape feeds)
│   │   ├── presets.ts                  # Popular feeds presets
│   │   ├── builder.ts                  # Feed builder (analyze + scrape config)
│   │   └── watcher.ts                  # FeedWatcher (poll, dedupe, send) — THIS AGENT
│   ├── state/
│   │   ├── types.ts                    # Entity interfaces + row mappers
│   │   ├── app-state.ts                # AppState (in-memory primary layer, dedupe)
│   │   └── redis.ts                    # RedisCoordinator (optional cross-instance)
│   ├── webhook/
│   │   └── discord.ts                  # Direct Discord webhook POST + retry, feedEmbed
│   ├── db/
│   │   ├── database.ts                 # node:sqlite wrapper
│   │   ├── schema.ts                   # DDL
│   │   └── repository.ts               # Write-through persistence over AppState
│   └── scheduler/
│       └── scheduler.ts                # In-process interval scheduler
└── .agents/
    └── agents/
        └── feed-watcher.md             # This file
```

## Setup & Workflow Commands

```bash
# Build TypeScript
npm run build

# Run the service (in-process scheduler drives feed polling)
npm start

# Env-driven overrides (optional; all under DISCORD_RSS_* prefix)
```
- Poll interval: `DISCORD_RSS_POLL_INTERVAL_MS` (default 60s).

## Key Patterns

### 1. Poll (`src/feed/watcher.ts`)
- Enumerate all enabled feeds from `repo.listFeedsForAllUsers()` (AppState-backed).
- For each: load the per-user webhook row; skip if disabled/missing.
- Acquire a distributed poll lock via `RedisCoordinator` when Redis configured (`feed:{id}`), else single-instance.
- Fetch via `fetchRaw`, detect Cloudflare challenge, page-marker check (`rss|atom|rdf`), HTTP status handling.
- Parse via `parseFeed` (RSS/Atom) **or** scrape via `scraper.ts` when `feedType === 'scrape'`.

### 2. Dedupe (AppState + optional Redis)
- Compute entry GUID via `withGuid(...)`; skip if `repo.isEntrySent`.
- When Redis present, also check `redis.isEntrySent` (cross-instance) and `redis.markEntrySent` after delivery.
- Oldest-first delivery: `toSend.reverse()`.

### 3. Delivery (`src/webhook/discord.ts`)
- Build embed via `feedEmbed(...)` (title, url, description, author, publishedAt, feedTitle, color).
- `sendWebhook(webhook.url, { username, embeds })` — direct POST with retry loop (5 attempts, 5xx backoff, 429 `Retry-After` capped at 15s).
- On success: `repo.markEntrySent` (memory + SQLite write-through). On failure: warn and stop.

### 4. State & Poll Bookkeeping
- `repo.setFeedChecked(userId, id, lastEntryId)` after each poll.
- Per-user webhooks are SQLite rows (`webhooks` table), dashboard-managed — never env vars.

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `DISCORD_RSS_PORT` / `DISCORD_RSS_HOST` | Bind address |
| `DISCORD_RSS_POLL_INTERVAL_MS` | Feed poll interval |
| `DISCORD_RSS_REQUEST_TIMEOUT_MS` | Fetch timeout |
| `DISCORD_RSS_REDIS_URL` | Optional cross-instance coordination |
| `CLOUDFLARE_API_KEY` / `CHALLENGE_SOLVER_URL` | Optional Cloudflare challenge resolution |