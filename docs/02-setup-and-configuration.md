# Setup and configuration

This page covers the runtime setup for the repository and how the scheduling, state files, secrets, and webhook naming work together.

## Required repository secrets

Use repository secrets (under Settings -> Secrets and variables -> Actions) rather than `.env` files or branch-specific settings. All webhook URLs must use the `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming pattern.

### Base site and feed secrets

- `SITE_URL` — base URL for the forum or site being monitored
- `{SOURCE}_RSS_URL_{###}` — optional feed URL override
- `DISCOHOOK_WEBHOOK_URL_001` — primary Discohook webhook (requires bot invitation; `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern)
- `DISCOHOOK_WEBHOOK_URL_002` — additional Discohook webhook (optional)

### Optional status secrets

- `SITE_STATUS_WEBHOOK_URL_001` — status transition webhook using `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming
- `SITE_STATUS_WEBHOOK_URL_002` — additional status webhook (optional)

### Optional external API secrets (Cloudflare challenge resolution)

- `CLOUDFLARE_API_KEY` — external challenge-solving API key (only if needed for protected sites)
- `CHALLENGE_SOLVER_URL` — endpoint for external challenge-solving service (optional)

## Optional overrides

The feed job supports the following optional environment inputs:

- `{SOURCE}_RSS_URL_{###}` — explicit feed URL or comma-separated list of URLs
- `SITE_URL` — the base site URL used for feed discovery
- `ALLOWED_HOSTS` — comma-separated hosts allowed for posts
- `EXCLUDED_URL_SUBSTRINGS` — strings to ignore when scanning post links
- `MAX_POSTS` — maximum number of backlog posts to send in one run
- `STATE_FILE` — location of the feed state file

The site-status workflow supports:

- `SITE_URL` — the forum base URL to monitor
- `SITE_STATUS_STATE_FILE` — location of the status state file
- `SITE_STATUS_WEBHOOK_URL_{###}` — status alert webhook loaded sequentially

## State files

The repository writes state files to the repository so it remembers the most recently processed item or status. Atomic writes (`os.rename()`) prevent corruption during concurrent runs.

- `.github/feed-state.json` — last seen feed item ID
- `.github/site-status-state.json` — last known online/offline state

These files are committed back to the repository automatically by the GitHub Actions job so the next run continues from the correct point.

## Scheduled behavior

The workflows run on different schedules:

- feed workflow: `0 * * * *` (hourly at the top of the hour)
- status workflow: `*/30 * * * *` (every 30 minutes, but it only posts on a detected state change)

The feed workflow is designed so it only posts newly discovered content and never replays a full backlog after the initial run.

## Agent compliance

This repository follows `.agents/` conventions (`.agents/rules/`, `.agents/bugs/`, `.agents/plans/`, `.agents/skills/`). All agent rules enforce GitHub Secrets-only webhook storage, zero unsolicited framework injection, and strict instruction compliance.

## Local validation

The repository's validation command is:

```bash
npm run build
npm start
```

This is the recommended check after making changes to scripts, workflow logic, or agent configurations.
