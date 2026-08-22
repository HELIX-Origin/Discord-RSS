# Setup and configuration

This page covers the runtime setup for the repository and how the scheduling, state files, and secrets work together.

## Required repository secrets

Use repository secrets rather than environment-scoped or branch-specific GitHub Actions secrets because the workflow is designed to run from the repository itself and should not depend on ephemeral environment settings.

GitHub's UI is a little confusing here: the secret page is under Settings -> Secrets and variables -> Actions, and GitHub labels these as repository secrets in the Actions context.

### Base site and feed channel secrets

- `SITE_URL` — base URL for the forum or site being monitored
- `DISCORD_WEBHOOK_URL` — Discord webhook used for new forum post alerts

### Optional status channel secret

- `DISCORD_STATUS_WEBHOOK_URL` — separate Discord webhook used for online/offline alerts

## Optional overrides

The feed job supports the following optional environment inputs:

- `FEED_URL` or `FEED_URLS` — explicit feed URL or comma-separated list of URLs
- `SITE_URL` — the base site URL used for feed discovery
- `ALLOWED_HOSTS` — comma-separated hosts allowed for posts
- `EXCLUDED_URL_SUBSTRINGS` — strings to ignore when scanning post links
- `MAX_POSTS` — maximum number of backlog posts to send in one run
- `STATE_FILE` — location of the feed state file

The site-status workflow supports:

- `SITE_URL` — the forum base URL to monitor
- `DISCORD_STATUS_WEBHOOK_URL` — webhook used for status alerts
- `SITE_STATUS_STATE_FILE` — location of the status state file

## State files

The repository writes state files to the repository so it remembers the most recently processed item or status.

- `.github/feed-state.json` — last seen feed item ID
- `.github/site-status-state.json` — last known online/offline state

These files are committed back to the repository automatically by the GitHub Actions job so the next run continues from the correct point.

## Scheduled behavior

Both workflows run on a 30-minute cron schedule:

- feed workflow: `*/30 * * * *`
- status workflow: `*/30 * * * *`

The feed workflow is designed so it only posts newly discovered content and never replays a full backlog after the initial run.

## Local validation

The repository’s validation command is:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

This is the recommended check after making changes to scripts or workflow logic.
