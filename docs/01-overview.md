# Overview

VirtualCustoms-Feed is a lightweight automation project for monitoring a Virtual Customs forum and turning new forum posts into Discord notifications. It is designed for GitHub-hosted automation so the site can be watched without needing a persistent local service.

## Core purpose

The project focuses on three things:

1. Discovering active RSS/Atom feed URLs from the site
2. Filtering out unwanted or off-site content
3. Posting only new entries to Discord so the channel stays focused

## How it works

- The feed workflow runs hourly at the top of each hour
- It fetches the configured feed or auto-discovers feed URLs from the site
- It filters posts to the allowed host and removes known noisy forum URLs
- It stores the most recently posted entry ID in a JSON state file
- It posts only the newer unseen entries to Discord
- A second workflow monitors site availability and posts only on online/offline transitions

## Repository layout

- `scripts/post_feed_to_discord.py` — feed discovery, feed parsing, filtering, and Discord posting
- `scripts/post_site_status.py` — wrapper used to run the status monitor
- `.github/workflows/post-feed-to-discord.yml` — scheduled feed-posting workflow
- `.github/workflows/site-status-alert.yml` — scheduled site-status workflow
- `tests/test_post_feed_to_discord.py` — validation for feed URL discovery, filtering, and embed formatting
- `docs/` — repository documentation

## Why the status monitor exists

The feed monitor answers: “What changed recently?” The status monitor answers: “Is the site up or down?”

Those are distinct problems, so this repo intentionally keeps them separate:

- feed alerts go to the main Discord channel
- site-status alerts go to a different webhook and channel when configured
- both use independent state files so they do not interfere with each other

## Optional vBulletin support

The project does not require a site-level code change to work, but it runs more smoothly when the host exposes clean, standard RSS/Atom feed endpoints. This is especially helpful for sites behind Cloudflare or anti-bot protections because a clean feed route is easier to fetch predictably.

The repository includes a dedicated vBulletin support guide for forum administrators who want to add that optional support.
