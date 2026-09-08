# Site-Feed-Discord

GitHub Actions bot for monitoring RSS/Atom feeds from websites and forums and posting new items to Discord. Supports Cloudflare-protected domains via `playwright` or optional external challenge-solving APIs (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`).

## Documentation

- [Documentation index](docs/README.md)
- [Overview](docs/01-overview.md)
- [Setup and configuration](docs/02-setup-and-configuration.md)
- [vBulletin support for site hosts](docs/03-vbulletin-support.md)
- [Status monitoring](docs/04-status-monitoring.md)
- [Troubleshooting](docs/05-troubleshooting.md)

## Required configuration

GitHub refers to these as repository secrets. Configure them under Settings -> Secrets and variables -> Actions. Use the `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming convention for all webhook URLs.

- Repository secret: `SITE_URL` — base site URL for the forum or site being monitored
- Repository secret: `DISCORD_WEBHOOK_URL_001` — main feed webhook (pattern: `{SERVICE_NAME}_WEBHOOK_URL_{###}`)
- Repository secret: `DISCORD_WEBHOOK_URL_002` — additional feed webhook (optional)
- Repository secret: `SITE_STATUS_WEBHOOK_URL_001` — status transition alert webhook
- Repository secret: `SITE_STATUS_WEBHOOK_URL_002` — additional status webhook (optional)
- Optional override: `{SOURCE}_RSS_URL_{###}` (comma-separated list when a specific site feed should be used)
- Optional: `CLOUDFLARE_API_KEY` and `CHALLENGE_SOLVER_URL` for external challenge-solving (Cloudflare-protected sites)

The workflow auto-discovers the active RSS/Atom feed URLs from the configured site by default, so a `{SOURCE}_RSS_URL_{###}` secret is not required. All runtime configuration is expected to come from repository secrets and must not be committed into the repository.
The feed workflow stores its last-seen feed item in `.github/feed-state.json` using atomic writes (`os.rename()`). The status workflow stores the last-known online/offline state in `.github/site-status-state.json` using atomic writes as well.

## How to set up and deploy

Users clone the repo, install (`npm ci`), configure secrets, build (`npm run build`), and run (`npm start`). The CI workflow (`.github/workflows/ci.yml`) verifies TypeScript build, vitest, secret naming, and agent rules.

Users clone the repo, install (`npm ci`), configure secrets, build (`npm run build`), and run (`npm start`). The CI workflow (`.github/workflows/ci.yml`) verifies TypeScript build, vitest, secret naming, and agent rules.

1. Clone the repository.
2. Configure repository secrets (`SITE_URL`, `DISCOHOOK_WEBHOOK_URL_001`, `{SOURCE}_RSS_URL_{###}`, optional `CLOUDFLARE_API_KEY`).
3. Invite the Discohook bot (`https://discohook.app/bot`) to your Discord server.
4. Build: `npm run build`
5. Run: `npm start`
6. Verify: `npm test`

## Project architecture

The repository uses a modular TypeScript architecture (`src/index.ts`, `src/handlers/`, `src/modules/`, `src/functions/`, `src/types/`). The primary webhook method is Discohook (`DISCOHOOK_WEBHOOK_URL_001`), requiring the Discohook bot invitation to the server. Feed URLs are configured via `{SOURCE}_RSS_URL_{###}` secrets. Cloudflare-protected domains can use optional external challenge-solving APIs (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`) or `playwright`.

- Polls the configured feed hourly when triggered via CI scan (`.github/workflows/ci.yml`) or manual trigger (`gh workflow run ci.yml`)
- Posts only newly seen entries to Discord (scans `DISCOHOOK_WEBHOOK_URL_001` upward sequentially)
- Skips initial historical backfill on the first run
- Limits each run to the 5 newest unseen posts, so a backlog cannot grow without bound
- Limits posts to entries under the configured `SITE_URL`
- Excludes known noisy and staff-only URLs such as admin, moderator, and staff paths
- Sends each post to Discord as a rich embed with title, author, link, and publish time
- Status monitoring available via TypeScript module (`node dist/index.js`) with `SITE_STATUS_WEBHOOK_URL_001` transition alerts
- Supports external APIs for Cloudflare challenge resolution (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`)
- Uses CI code scan workflow (`.github/workflows/ci.yml`) for TypeScript build verification, secret naming scan (`{SERVICE_NAME}_WEBHOOK_URL_{###}`, `{SOURCE}_RSS_URL_{###}`), agent rules compliance, and vitest (`npm test`).

## Agent compliance

This repository follows `.agents/` conventions (`.agents/rules/`, `.agents/bugs/`, `.agents/plans/`, `.agents/skills/`). All agent rules enforce GitHub Secrets-only webhook storage, zero unsolicited framework injection (`rules/01`), centralized message formatting (`rules/03`), remote issue protocols (`rules/04`), documentation standards (`rules/05`), and agent safety (`rules/00`).

## Local validation

```bash
npm test
npm run build
```
