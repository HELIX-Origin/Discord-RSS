# VirtualCustoms-Feed Documentation

This repository automates the process of monitoring a Virtual Customs forum, discovering new posts, and sending the newest updates to a Discord channel. It also includes a separate site-status monitor that can alert a different Discord webhook whenever the forum changes between online and offline states.

## Documentation map

- [Overview](./01-overview.md) — repository purpose, architecture, and how the automation works
- [Setup and configuration](./02-setup-and-configuration.md) — required secrets, environment variables, and scheduled jobs
- [vBulletin support for site hosts](./03-vbulletin-support.md) — how a forum host can optionally expose clean RSS/Atom feeds for smoother operation
- [Status monitoring](./04-status-monitoring.md) — how the site status alert works and how to troubleshoot false negatives
- [Troubleshooting](./05-troubleshooting.md) — common problems, Cloudflare issues, and recovery steps

## Why this project exists

The feed bot exists to make the Virtual Customs site easier to follow without constantly checking the forum manually. It watches the site for new threads and posts, filters out noise, and sends only relevant updates to Discord.

The project is intentionally lightweight:

- it uses GitHub Actions scheduled jobs instead of a dedicated server
- it persists a small JSON state file to avoid reposting the same content
- it supports a dedicated site-status channel for outages and recovery alerts
- it can operate without a custom integration on the forum, but the host can improve reliability by exposing standard RSS/Atom feeds cleanly

## Quick start

1. Add the required repository secrets for the feed bot and, optionally, the separate status webhook.
2. Use the default workflow if you are just monitoring the main forum feed.
3. Review the configuration page for environment overrides and state file behavior.
4. If you are a site host, follow the vBulletin support guide to enable feed support for smoother operation.

## Related files

- `scripts/post_feed_to_discord.py` — main feed discovery, filtering, and posting logic
- `scripts/post_site_status.py` — site availability status check
- `.github/workflows/post-feed-to-discord.yml` — Discord feed schedule and jobs
- `.github/workflows/site-status-alert.yml` — status monitor schedule and jobs
- `tests/test_post_feed_to_discord.py` — unit tests for discovery, filtering, and message formatting
