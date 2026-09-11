# Troubleshooting Guide

Common issues when self-hosting or configuring Discord RSS.

## Installation / startup

### `Error: Cannot find module 'node:sqlite'`

You need Node.js >= 22.5. Run `node --version` and upgrade if needed.

### Port 3434 is already in use

The `.env` default is `PORT=3434`. If another process is using it, set a different port or kill the stale process. On Windows:

```cmd
netstat -ano | findstr :3434
taskkill /PID <PID> /F
```

## Feeds

### Feed is not polled

- Check the dashboard **Dev Tools** tab (host-only) and click **Poll all feeds now**.
- Verify `POLL_INTERVAL_MS` is set and the scheduler is running.
- Look at the JSON logs for `level: error` or `level: warn` from `source: feed`.

### Duplicate posts to Discord

- Discord RSS deduplicates by entry `link` (or generated `id`). If the site changes URLs between polls, duplicates can occur.
- For scrape feeds, ensure the `link` selector returns a stable absolute URL.

### `Cloudflare challenge` error

The site is behind a Cloudflare browser challenge. Options:

1. Connect a Cloudflare account in **Integrations** and use Cloudflare Browser Rendering.
2. Use a host-side proxy or cookie jar.
3. Switch to a public RSS feed if the site offers one.

### Login-walled forum

See the forum integration docs:

- [vBulletin](./vbulletin.md)
- [phpBB](./phpbb.md)

## Webhooks

### `404` or `401` from Discord

- Verify the webhook URL in the dashboard.
- Discord webhook URLs look like: `https://discord.com/api/webhooks/{id}/{token}`.
- Do not include extra path segments after the token.

### Messages not delivered

- Check the JSON logs for `source: webhook` errors.
- The dashboard **Dev Tools** tab shows recent activity including webhook results.

## Redis

### Redis is configured but coordination is not working

- Verify `REDIS_URL` is set and reachable.
- Redis is optional; without it, deduplication and locks are local to the process.

## Logging

Set `LOG_LEVEL` to one of: `debug`, `info`, `warn`, `error`.

Default is `info`. Use `debug` for verbose scheduler/watcher output.
