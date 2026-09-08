# Plan: Complete Modular Testing, Debugging & Linting Suite Rebuild

**Status:** Planning  
**Parent:** #4 — [PLAN] Multi-user Discord RSS rebuild  
**Rule 04 compliance:** This document is the roadmap for the test-suite rebuild. A GitHub issue (#9) will track it.

## Problem Statement

The previous Vitest suite grew ad-hoc: every test file invented its own mock servers, DB paths, HTTP clients, and `AppDeps` construction. Adding an integration test (e.g. Redis coordination, Cloudflare OAuth, multi-instance locking) required duplicating boilerplate and fighting the existing smoke test. It was not a complete testing and debugging platform, and it had no linting or formatting integration.

This plan defines a **modular, reusable test architecture** so that any feature — including Redis smoke, OAuth flows, Cloudflare rendering, and forum scrape feeds — can be tested by composing shared helpers, not by writing new scratch infrastructure. It also adds first-class linting, formatting, and debugging commands.

## Goals

1. **One way to build dependencies.** Every test that needs `AppDeps`, a database, a web server, or a Redis coordinator gets them from shared helpers.
2. **Mock everything external.** HTTP traffic goes through MSW *or* typed local mock servers. Redis gets an in-memory RESP mock server. Discord webhooks get a local capture server.
3. **No test pollution.** Databases and data dirs are isolated per test file via PID + timestamp naming. `beforeAll`/`afterAll` lifecycle helpers clean up.
4. **Source + dist coverage.** Smoke tests run against both `src/` (via direct import) and `dist/` (via build output) without copy-pasting test logic.
5. **Debugging first.** Tests emit structured logs and capture request/response traces; failed tests leave enough context to diagnose issues without reproducing manually.
6. **Linting and formatting are part of the suite.** `npm run check` runs type-check, lint, format-check, and tests in one command.

## Proposed Directory Layout

```text
tests/
  vitest.config.ts          # project-wide config, global setup/teardown
  setup.ts                  # global setup: MSW server, console log capture
  teardown.ts               # global teardown
  helpers/
    factories.ts            # feed/webhook/user/monitor factories
    app-deps.ts             # buildAppDeps({ redisUrl?, db?, ... })
    server.ts               # start/stop HTTP app server on ephemeral port
    http-client.ts          # cookie-jar fetch wrapper
    db.ts                   # ephemeral Database.open + close
    redis.ts                # create ephemeral redis coordinator (real or mock)
    lifecycle.ts            # wrap beforeAll/afterAll with cleanup logging
  mocks/
    redis-server.ts         # lightweight RESP in-memory mock server
    rss-server.ts           # typed RSS/Atom/HTTP mock server
    webhook-server.ts       # Discord webhook capture server
    cloudflare-server.ts    # mock Cloudflare Browser Rendering API
    msw-handlers.ts         # MSW default handlers (Discord, external APIs)
    msw-server.ts           # MSW lifecycle for integration tests
  fixtures/
    rss/                    # sample RSS 2.0, Atom, RDF files
    html/                   # sample forum/listing HTML
    selectors/              # valid/invalid scrape selector sets
  unit/                     # isolated module tests
    auth/
    db/
    feed/
    http/
    oauth/
    state/
    status/
    util/
    webhook/
  integration/              # multi-module tests
    feed-watcher.test.ts
    status-watcher.test.ts
    redis-coordination.test.ts
    oauth-cloudflare.test.ts
    api/
      auth.test.ts
      feeds.test.ts
      webhooks.test.ts
      monitors.test.ts
      settings.test.ts
      dev-tools.test.ts
  smoke/                    # end-to-end
    source.test.ts
    dist.test.ts
```

## Shared Infrastructure Modules

### `tests/helpers/factories.ts`

Plain-object factories for all domain entities. No side effects.

```ts
export function userFactory(overrides?: Partial<UserRow>): UserRow;
export function feedFactory(overrides?: Partial<Feed>): Feed;
export function webhookFactory(overrides?: Partial<Webhook>): Webhook;
```

### `tests/helpers/db.ts`

- `openTestDb(prefix: string): Database`
- `closeTestDb(db: Database): Promise<void>`
- Ensures `DISCORD_RSS_TEST_DATA` fallback to `data/.tmp` and creates the directory.

### `tests/mocks/redis-server.ts`

A `node:net` server implementing the subset of RESP2 used by `redis@5` and the coordinator:

- `PING`
- `SISMEMBER`, `SADD`
- `SET ... NX EX ...`
- `DEL`
- `QUIT`
- Unknown commands return `+OK` so incidental handshake commands do not fail.

This removes the need for a real Redis binary in CI or on Windows.

### `tests/helpers/redis.ts`

- `withMockRedis<T>(fn: (url: string) => Promise<T>): Promise<T>`
  - Starts the in-memory RESP mock server on `127.0.0.1:0`.
  - Returns a `redis://` URL.
  - Stops the server after the callback.
- `withRedisCoordinator<T>(fn: (redis) => Promise<T>): Promise<T>`
  - Composes `withMockRedis` + `createRedisCoordinator`.

### `tests/helpers/app-deps.ts`

```ts
export async function buildAppDeps(options?: {
  db?: Database;
  config?: Partial<AppConfig>;
  redisUrl?: string | null;
}): Promise<{ deps: AppDeps; cleanup: () => Promise<void> }>;
```

Uses `db.ts`, `redis.ts`, `config.ts`, and wires watchers. Every integration test uses this single builder.

### `tests/helpers/server.ts`

```ts
export async function startAppServer(deps: AppDeps): Promise<{ url: string; stop: () => Promise<void> }>;
```

Binds to port `0`, returns the actual URL.

### `tests/helpers/http-client.ts`

```ts
export class TestClient {
  constructor(baseUrl: string);
  async request(method, path, body?): Promise<{ status, headers, body }>;
  get cookie(): string;
}
```

Handles `set-cookie` automatically and JSON parsing.

### `tests/mocks/msw-handlers.ts` and `tests/mocks/msw-server.ts`

- Default handlers for Discord webhook execute URLs, generic external APIs, and Cloudflare.
- Integration tests can override handlers per-test.
- Unit tests that do not need network get MSW passthrough or no setup.

## Test Categories and Coverage Map

| Source module | Unit tests | Integration tests |
|---|---|---|
| `auth/password.ts` | scrypt hash/verify | — |
| `auth/service.ts` | validation, expiry | register → login → logout flow |
| `db/database.ts` | schema migration | WAL / FK behavior |
| `db/repository.ts` | CRUD, scoping | write-through to AppState |
| `state/app-state.ts` | hydrate/mutate/list | repository round-trip |
| `state/redis.ts` | `isEntrySent`, locks | multi-instance dedupe, lock contention |
| `feed/xml.ts`, `parser.ts` | RSS2/Atom/RDF parsing | malformed input handling |
| `feed/scraper.ts`, `html.ts` | selector extraction | relative URL resolution |
| `feed/fetch.ts` | timeout/headers | Cloudflare challenge detection |
| `feed/builder.ts` | URL analysis | sample extraction |
| `feed/watcher.ts` | — | poll → webhook delivery, dedupe, Redis path |
| `status/watcher.ts` | — | up/down transition alerts |
| `webhook/discord.ts` | retry/back-off | MSW delivery capture |
| `http/router.ts` | route matching | — |
| `http/helpers.ts` | cookie parsing | — |
| `http/dev-tools.ts` | — | admin API auth/behavior |
| `server.ts` | — | full API surface smoke |
| `scheduler/scheduler.ts` | — | interval polling triggers |
| `config.ts` | parsing/env fallback | — |
| `util/logger.ts` | level filtering | JSON output shape |

## Linting & Formatting

### ESLint

- Install `eslint`, `@eslint/js`, `typescript-eslint`.
- Config: `eslint.config.js` (flat config) with recommended TypeScript rules, unused-vars, and no `console.log` outside `src/util/logger.ts`.
- Run: `npm run lint` → `eslint src tests --ext .ts`.

### Prettier

- Install `prettier`.
- Config: `.prettierrc` (single quote, print width 120, trailing comma `all`).
- Run: `npm run format` to write, `npm run format:check` to verify in CI.

### TypeScript

- `npm run typecheck` → `tsc --noEmit`.

### Unified Check Command

- `npm run check` runs `typecheck`, `format:check`, `lint`, and `test` in sequence.

## Debugging Support

- **Structured test logs.** `tests/setup.ts` captures `console.*` output and writes it to `data/.tmp/logs/vitest-<pid>.log` only when a test fails.
- **Request traces.** `TestClient` and mock servers log every request/response at `debug` level when `DISCORD_RSS_LOG_LEVEL=debug` is set.
- **Failure artifacts.** Failed integration tests dump `AppDeps.config`, recent `activity_log` rows, and the last 20 logger events into the test failure message.
- **Slow-test reporter.** Vitest config enables `reporter: ['verbose', 'html']` and flags tests > 5 s.

## Implementation Phases

1. **Foundation (PR #9.1)**
   - Create directory layout.
   - Implement `tests/helpers/db.ts`, `factories.ts`, `lifecycle.ts`.
   - Implement `tests/mocks/redis-server.ts`.
   - Implement `tests/helpers/redis.ts`.
   - Add `tests/vitest.config.ts` and `tests/setup.ts`.

2. **AppDeps + Server Helpers (PR #9.2)**
   - `tests/helpers/app-deps.ts`.
   - `tests/helpers/server.ts`.
   - `tests/helpers/http-client.ts`.
   - `tests/mocks/rss-server.ts`, `webhook-server.ts`.

3. **MSW + Network Mocks (PR #9.3)**
   - `tests/mocks/msw-handlers.ts`, `msw-server.ts`.
   - `tests/mocks/cloudflare-server.ts`.

4. **Linting & Formatting (PR #9.4)**
   - Install and configure ESLint + Prettier.
   - Add scripts: `lint`, `format`, `format:check`, `typecheck`, `check`.
   - Fix all existing lint/format violations in `src/`.

5. **Unit Tests (PR #9.5)**
   - Port and refactor all prior unit tests into `tests/unit/**` using the new helpers.

6. **Integration Tests (PR #9.6)**
   - Feed watcher, status watcher, Redis coordination, auth API, feed API, webhook API, dev-tools API.

7. **Smoke Tests (PR #9.7)**
   - `tests/smoke/source.test.ts` using `src/` imports.
   - `tests/smoke/dist.test.ts` using `dist/` imports.

8. **Cleanup + Documentation (PR #9.8)**
   - Restore `npm test` script to `vitest run`.
   - Delete legacy helper duplicates.
   - Update `AGENTS.md` with testing conventions.
   - Close #9.

## Acceptance Criteria

- [ ] `npm run check` runs type-check, lint, format-check, and tests and passes.
- [ ] Adding a new integration test requires only composing existing helpers.
- [ ] Redis coordination is testable without installing Redis.
- [ ] Smoke tests cover both `src/` and `dist/`.
- [ ] No test file contains ad-hoc mock server code.
- [ ] Failed tests emit enough structured context to diagnose without manual reproduction.
- [ ] ESLint enforces no `console.log` outside `src/util/logger.ts`.
- [ ] Prettier formatting is enforced in CI.

## Rule 04 Tracking

- This plan file is the first post.
- GitHub issue #9 will be created from this file.
- Progress will be recorded by editing issue #9 and this plan.
