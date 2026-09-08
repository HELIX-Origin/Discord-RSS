# Rule 02: TypeScript Source Conventions

## Project
**Discord RSS** — native TypeScript ESM, Node `>=22.9`. No runtime framework; `node --env-file-if-exists=.env` for env loading.

## Mandatory Source Layout

```
src/
├── index.ts                        # Entry: boot config, db, repo, redis, watchers, server
├── app.ts                          # AppDeps interface (config, db, repo, oauth, feeds, status, redis)
├── config.ts                       # Env parsing (DISCORD_RSS_*)
├── server.ts                       # HTTP server assembly + route mounting
├── auth/
│   ├── password.ts                 # Password hashing (scrypt)
│   └── service.ts                  # AuthService (register/login/session)
├── db/
│   ├── database.ts                 # node:sqlite wrapper (DatabaseSync)
│   ├── schema.ts                   # DDL + migrations
│   └── repository.ts               # Write-through persistence over AppState
├── feed/
│   ├── fetch.ts                    # fetchRaw + Cloudflare challenge detection
│   ├── html.ts                     # HTML parsing (DOMParser equivalent)
│   ├── parser.ts                   # RSS/Atom parsing, stripHtml, withGuid, FeedEntry
│   ├── xml.ts                       # XML helpers
│   ├── scraper.ts                  # HTML item scraping (selector-based)
│   ├── presets.ts                  # Popular feeds presets
│   ├── builder.ts                  # Feed builder (analyze + scrape config)
│   └── watcher.ts                  # FeedWatcher (poll, dedupe, send)
├── http/
│   ├── router.ts                   # Route matching
│   ├── helpers.ts                  # Request/response utils, auth guard
│   ├── login.ts                    # Login/register page
│   ├── dashboard.ts                # Dashboard page + API handlers (UI/JS)
│   └── oauth-callback.ts           # OAuth callback handler
├── oauth/
│   ├── types.ts                    # OAuth provider types
│   ├── cloudflare.ts               # Cloudflare OAuth provider
│   └── service.ts                  # OAuthService (state, exchange, callback)
├── scheduler/
│   └── scheduler.ts                # Interval scheduler
├── state/
│   ├── types.ts                    # Entity interfaces + row mappers
│   ├── app-state.ts                # AppState (in-memory primary layer)
│   └── redis.ts                    # RedisCoordinator (optional cross-instance)
├── status/
│   └── watcher.ts                  # StatusWatcher (transition-only alerts)
└── webhook/
    └── discord.ts                  # Direct Discord webhook POST + retry, feedEmbed
```

## TypeScript Conventions
- Strict TypeScript (`tsconfig.json` with `"strict": true`), ESM (`"type": "module"`), imports use `.js` extensions.
- Architecture: **AppState (in-memory) is the primary read/mutate layer**; SQLite (`node:sqlite`) is persistence-only via write-through repository. Dashboard/watchers must never block on DB reads.
- Optional Redis behind `DISCORD_RSS_REDIS_URL` for cross-instance dedupe + poll locks; graceful no-op when unset.
- All feed parsing must handle network errors gracefully (try/catch). Encoding fallbacks required for non-UTF-8 feeds.
- When targeting Cloudflare-protected domains, `playwright` or external challenge API is permitted; fall back to native `fetch` when no challenge markers are present.
- No `.env` is ever committed; reference `.env.example` (Rule 00/05).

## Deployment Conventions
- Self-hosted; the app runs its own `Scheduler` in-process, no host cron needed.
- Verify locally with `npm run build` before deployment.

## Later Direction (approved)
- Large modules to be split into `lib/` mirroring `src/` as the single source of truth (post-verification).