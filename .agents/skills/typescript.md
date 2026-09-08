# TypeScript / Node Development Skill

## Environment
- Node.js `>=22.9` and TypeScript 7.x with strict mode (`tsconfig.json`), ESM (`"type": "module"`).
- Native runtimes only: `node:http`, `node:sqlite`, `node:crypto`, global `fetch`. Env loading via `node --env-file-if-exists=.env` (no `dotenv`).
- Approved runtime dep: `redis@^5` (optional cross-instance coordination). Dev tooling: `typescript`, `@types/node`, `vitest`.

## Project Layout
```
src/
  index.ts            # Entry: boot config, db, repo, redis, watchers, server
  app.ts              # AppDeps (config, db, repo, oauth, feeds, status, redis)
  config.ts           # DISCORD_RSS_* env parsing
  server.ts           # HTTP server assembly
  auth/               # password.ts, service.ts
  db/                 # database.ts, schema.ts, repository.ts
  feed/               # fetch/html/parser/xml/scraper/presets/builder/watcher
  http/               # router/helpers/login/dashboard/oauth-callback
  oauth/              # types/cloudflare/service
  scheduler/          # scheduler.ts (in-process intervals)
  state/              # types/app-state/redis
  status/             # watcher.ts
  webhook/            # discord.ts (direct POST + retry, feedEmbed)
```

## Key Commands
- Build TypeScript: `npm run build`
- Run entry: `npm start` (uses `--env-file-if-exists=.env`)
- Run tests: `npm test` (vitest)
- Watch build: `npm run dev` (tsc --watch)

## Key Patterns
- **AppState-first reads**: the dashboard/watchers read from the in-memory `AppState`; SQLite is write-through persistence only.
- **Safe URL fetching**: `fetchRaw(url)` with `AbortSignal`s + timeout (see `src/feed/fetch.ts`).
- **UTF-8 resilience**: decode with fallback to `latin1` (`TextDecoder`) rather than crashing.
- **Type safety**: entity interfaces (`User`, `Feed`, `Webhook`, `SiteMonitor`, ...) exported from `src/state/types.ts`; row mappers `rowTo*` convert SQLite rows.
- **Direct Discord delivery**: `sendWebhook(url, payload)` from `src/webhook/discord.ts` with retry/backoff.
- **Redis optional**: `createRedisCoordinator(url)` returns `null` when unset/unreachable; watchers degrade to single-instance.