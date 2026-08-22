# Status monitoring

The repository includes a separate status monitor to answer a different question than the feed monitor: “Is the site online right now?”

## Why it is separate

Feed monitoring and site monitoring are not the same signal. A forum can still have valid RSS content while being slow or partially offline, and a site can be reachable without new posts being published.

Because of that, the repository uses two independent checks:

- one workflow watches for feed updates and posts to the main Discord webhook
- one workflow watches site availability and posts to the status Discord webhook only on state changes

## Behavior

- the status monitor runs every 30 minutes
- it fetches the site URL and checks whether the page is available
- it detects Cloudflare challenge pages and treats them as a site issue rather than a healthy state
- it stores the latest state in `.github/site-status-state.json`
- it sends a Discord alert only when the site changes from `up` to `down` or `down` to `up`

## Status state file

The status workflow writes a small file that tracks the last known status:

```json
{
  "status": "up"
}
```

The file is committed back to the repository by the workflow so future runs can compare against the prior state.

## Discord status payload

The status alert uses a separate Discord webhook and sends a lightweight embed with:

- a status title such as “Example site is offline”
- a link to the site URL
- a color-coded result
- a timestamp

This keeps feed updates and outage alerts visually distinct.
