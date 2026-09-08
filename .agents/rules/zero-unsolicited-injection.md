# Rule 01: Dependency & Tool Approval

## Effective Policy

The previous native-only dependency restriction is **rescinded**. Discord RSS is a modern TypeScript service; standard development tooling (linters, formatters, test frameworks, type definitions) and reasonable runtime libraries are allowed when they solve a real problem.

## Mandatory Invariants

1. **Runtime dependencies require explicit approval.** Any package added to `dependencies` in `package.json` must be approved by the user before `npm install`. Rationale and a fallback plan must be documented in the relevant issue/PR body.
2. **Dev dependencies are allowed without per-package approval.** Linters (ESLint), formatters (Prettier), test reporters, coverage tools, and similar dev-time tooling may be added as needed. Still prefer lightweight, widely-used tools.
3. **No unnecessary bloat.** Do not add frameworks that duplicate Node.js built-ins (e.g. an HTTP client when `fetch` is sufficient, or a full ORM when `node:sqlite` is sufficient).
4. **Discohook Removed.** Discohook is not part of this project. Discord posting is direct via `src/webhook/discord.ts`.
5. **Static Intelligence Only.** Feed parsing, filtering, dedupe, and message formatting are local TypeScript logic in this repository. No remote AI parsing services.

## Approved Runtime Dependencies

- `redis@^5` — optional cross-instance coordination (dedupe + poll locks) behind `DISCORD_RSS_REDIS_URL`; degrades gracefully when unset.
- `playwright` — permitted only for Cloudflare challenge resolution on scrape/feed fetching.

## Approved Dev Dependencies

- `typescript`, `@types/node`
- `vitest`, `@vitest/coverage-v8`
- `msw`
- `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-*` as needed
- `prettier`

Any other runtime dependency still requires explicit user approval.
