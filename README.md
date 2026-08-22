# VirtualCustoms-Feed

GitHub Actions workflow for posting new RSS/Atom feed entries to a Discord webhook.

## Required configuration

- GitHub Actions secret: `DISCORD_WEBHOOK_URL`
- GitHub Actions secret: `FEED_URL`

All runtime configuration is expected to come from repository Actions secrets and must not be committed into the repository.

## Behavior

- Polls the configured feed every 30 minutes
- Posts only newly seen entries to Discord
- Skips initial historical backfill on the first run
- Excludes entries that match the Virtual Customs `The Team` forum URL patterns

## Local validation

```bash
python -m unittest discover -s tests -p "test_*.py"
```