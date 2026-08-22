# Site-Feed-Discord

GitHub Actions bot for monitoring RSS/Atom feeds from websites and forums and posting new items to Discord.

## Documentation

- [Documentation index](docs/README.md)
- [Overview](docs/01-overview.md)
- [Setup and configuration](docs/02-setup-and-configuration.md)
- [vBulletin support for site hosts](docs/03-vbulletin-support.md)
- [Status monitoring](docs/04-status-monitoring.md)
- [Troubleshooting](docs/05-troubleshooting.md)

## Required configuration

GitHub refers to these as repository secrets, but they are configured under the repository's GitHub Actions secrets UI: Settings -> Secrets and variables -> Actions.

- Repository secret: `SITE_URL` — base site URL for the forum or site being monitored
- Repository secret: `DISCORD_WEBHOOK_URL`
- Repository secret: `DISCORD_STATUS_WEBHOOK_URL`
- Optional override: `FEED_URL` or `FEED_URLS` (comma-separated list when a specific site feed should be used)

The workflow auto-discovers the active RSS/Atom feed URLs from the configured site by default, so a `FEED_URL` secret is not required. All runtime configuration is expected to come from repository secrets and must not be committed into the repository.
The feed workflow stores its last-seen feed item in `.github/feed-state.json` and commits that file back to the repository automatically. The status workflow stores the last-known online/offline state in `.github/site-status-state.json` and commits that file back to the repository as well.

## Behavior

- Polls the configured feed hourly at the top of each hour
- Posts only newly seen entries to Discord
- Skips initial historical backfill on the first run
- Limits each run to the 5 newest unseen posts, so a backlog cannot grow without bound
- Limits posts to entries under the configured `SITE_URL`
- Excludes known noisy and staff-only URLs such as admin, moderator, and staff paths
- Sends each post to Discord as a rich embed with title, author, link, and publish time
- Polls the site status every 30 minutes on a separate workflow
- Posts to a dedicated status webhook only when the site transitions between online and offline states
- Uses a single concurrency group per workflow so overlapping scheduled runs do not duplicate posts

## Local validation

```bash
python -m unittest discover -s tests -p "test_*.py"
```