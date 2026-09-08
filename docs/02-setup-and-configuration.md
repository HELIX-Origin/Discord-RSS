# Setup and configuration

This page covers the runtime setup for the repository and how the scheduling (CI scan), state files, secrets, webhook naming, and TypeScript build work together.

## Clone and setup

Users clone the repository and set up locally:

```bash
git clone https://github.com/HELIX-Origin/Site-Feed-Discord.git
cd Site-Feed-Discord
npm ci
npm run build
npm start
```

Invite the Discohook bot (`https://discohook.app/bot`) to your Discord server before using Discohook webhooks.

## Required repository secrets

Use repository secrets (under Settings -> Secrets and variables -> Actions) rather than `.env` files or branch-specific settings. All webhook URLs must use the `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming pattern.

### Base site and feed secrets

- `SITE_URL` — base URL for the forum or site being monitored
- `{SOURCE}_RSS_URL_{###}` — optional feed URL override (e.g., `FORUM_RSS_URL_001`, `SITE_RSS_URL_001`)
- `DISCOHOOK_WEBHOOK_URL_001` — primary Discohook webhook (`{SERVICE_NAME}_WEBHOOK_URL_{###}` naming; requires bot invitation)
- `DISCOHOOK_WEBHOOK_URL_002` — additional Discohook webhook (optional)

### Optional status secrets

- `SITE_STATUS_WEBHOOK_URL_001` — status transition webhook (`{SERVICE_NAME}_WEBHOOK_URL_{###}` naming)
- `SITE_STATUS_WEBHOOK_URL_002` — additional status webhook (optional)

### Optional external API secrets (Cloudflare challenge resolution — only needed for protected sites like vBulletin forums)

- `CLOUDFLARE_API_KEY` — external challenge-solving API key (optional; only for Cloudflare-protected domains)
- `CHALLENGE_SOLVER_URL` — endpoint for external challenge-solving service (optional)

## TypeScript build and run

The repository is a TypeScript project (`src/index.ts`, `src/handlers/`, `src/modules/`, `src/functions/`, `src/types/`).

```bash
npm ci          # install dependencies (includes `npm install` equivalent for `src/package.json`)
npm run build    # compile TypeScript (`tsc`)
npm start      # run compiled TypeScript (`node dist/index.js`)
npm test       # run vitest suite (`tests/*.test.ts`)
```

## Optional overrides

The feed module supports the following optional environment inputs:

- `{SOURCE}_RSS_URL_{###}` — explicit feed URL or comma-separated list of URLs
- `SITE_URL` — the base site URL used for feed discovery
- `ALLOWED_HOSTS` — comma-separated hosts allowed for posts
- `EXCLUDED_URL_SUBSTRINGS` — strings to ignore when scanning post links
- `MAX_POSTS` — maximum number of backlog posts to send in one run
- `STATE_FILE` — location of the feed state file

The status module supports:

- `SITE_URL` — the forum base URL to monitor
- `SITE_STATUS_STATE_FILE` — location of the status state file
- `SITE_STATUS_WEBHOOK_URL_{###}` — status alert webhook loaded sequentially

## State files

The repository writes state files atomically (`os.rename()` via `.tmp` + rename) so concurrent runs do not corrupt state:

- `.github/feed-state.json` — last seen feed item ID
- `.github/site-status-state.json` — last known online/offline state

These files may be committed back to the repository automatically by workflow steps or manually.

## CI code scan behavior

The `.github/workflows/ci.yml` workflow runs on `push` and `pull_request`:

- TypeScript build verification (`npm run build`)
- Vitest execution (`npm test`)
- Secret naming scan (`{SERVICE_NAME}_WEBHOOK_URL_{###}`, `{SOURCE}_RSS_URL_{###}`)
- Agent rules verification (`.agents/rules/*.md`)

Manual triggers available via `gh workflow run ci.yml`.

## Agent compliance

This repository follows `.agents/` conventions (`.agents/rules/`, `.agents/bugs/`, `.agents/plans/`, `.agents/skills/`). All agent rules enforce GitHub Secrets-only webhook storage (`{SERVICE_NAME}_WEBHOOK_URL_{###}`), zero unsolicited framework injection (`rules/01`), centralized message formatting (`rules/03`), remote issue protocols (`rules/04`), documentation standards (`rules/05`), TypeScript architecture (`rules/02`), and agent safety (`rules/00`).

## Local validation

```bash
npm test
npm run build
npm start
```
