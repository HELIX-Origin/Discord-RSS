# Rule 01: Zero Unsolicited Framework Injection

## Mandatory Invariants
1. **No Unauthorized Dependencies**: Discord RSS uses native TypeScript / Node.js standard libraries (`node:http`, `node:sqlite`, `node:crypto`, `fetch`) plus TypeScript dev tooling (`typescript`, `@types/node`, `vitest`). No external HTTP clients, feed parsers, or Discord libraries (`discord.js`, `rss-parser`, `axios`, etc.) are permitted **unless** explicitly approved by the user.
2. **Approved External Dependencies**:
   - `redis@^5` — approved for optional cross-instance coordination (dedupe + poll locks) behind `DISCORD_RSS_REDIS_URL`; degrades gracefully when unset.
   - `playwright` — permitted **only** for Cloudflare challenge resolution on scrape/feed fetching.
   - External challenge-solving endpoints via `CLOUDFLARE_API_KEY` / `CHALLENGE_SOLVER_URL` — only when a site is confirmed behind a Cloudflare browser challenge. Must fall back to native `fetch` when no challenge is detected.
3. **No Heavy CI/CD Frameworks**: No unsolicited third-party CI/CD frameworks or schedulers. Scheduling is in-process via `src/scheduler/scheduler.ts`.
4. **Static Intelligence Only**: All feed parsing, filtering, dedupe, and message formatting is local TypeScript logic in this repository. No remote AI parsing services.
5. **Discohook Removed**: Discohook is no longer part of this project. Discord posting is direct via `src/webhook/discord.ts`.

## Explicit Approval Requirement
Any new runtime dependency requires explicit user approval before `npm install`. Adding one without approval is a violation.