# VirtualCustoms-Feed

GitHub Actions workflow for posting new RSS/Atom feed entries to a Discord webhook.

## Required configuration

- Repository secret: `DISCORD_WEBHOOK_URL`
- Optional override: `FEED_URL` or `FEED_URLS` (comma-separated list when a specific site feed should be used)

The workflow auto-discovers the active RSS/Atom feed URLs from the Virtual Customs site by default, so a `FEED_URL` secret is not required. All runtime configuration is expected to come from repository secrets and must not be committed into the repository.
The workflow stores its last-seen feed item in `.github/feed-state.json` and commits that file back to the repository automatically.

## Behavior

- Polls the configured feed every 30 minutes
- Posts only newly seen entries to Discord
- Skips initial historical backfill on the first run
- Limits each run to the 5 newest unseen posts, so a backlog cannot grow without bound
- Limits posts to entries under `https://virtualcustoms.net/`
- Excludes entries that match the Virtual Customs `The Team` forum URL patterns
- Sends each post to Discord as a rich embed with title, author, link, and publish time
- Uses a single concurrency group so overlapping scheduled runs do not duplicate posts

## Local validation

```bash
python -m unittest discover -s tests -p "test_*.py"
```