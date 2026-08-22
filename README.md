# VirtualCustoms-Feed

GitHub Actions workflow for posting new RSS/Atom feed entries to a Discord webhook.

## Required configuration

- GitHub Actions secret: `DISCORD_WEBHOOK_URL`
- GitHub Actions secret: `FEED_URL`

All runtime configuration is expected to come from repository Actions secrets and must not be committed into the repository.
The workflow stores its last-seen feed item in `/home/runner/work/VirtualCustoms-Feed/VirtualCustoms-Feed/.github/feed-state.json` and commits that file back to the repository automatically.

## Behavior

- Polls the configured feed every 30 minutes
- Posts only newly seen entries to Discord
- Skips initial historical backfill on the first run
- Excludes entries that match the Virtual Customs `The Team` forum URL patterns
- Uses a single concurrency group so overlapping scheduled runs do not duplicate posts

## Local validation

```bash
python -m unittest discover -s tests -p "test_*.py"
```