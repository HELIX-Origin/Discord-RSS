# Web Basics Skill

## Fundamentals
- All monitoring is based on public HTTP/HTTPS endpoints via `fetchRaw` (`src/feed/fetch.ts`).
- `fetch(url)` follows redirects by default; `response.status` decides online/offline.
- Timeouts via `AbortSignal.timeout(...)`; `maxBytes` caps the response body read.

## Status Checks (`src/status/watcher.ts`)
- `2xx-3xx` = online; anything else or an exception = down. `fetchRaw` returns `{ status, contentType, durationMs, text }` for detail.
- Transition-only alerts: notify only when status changes; skip the initial `unknown` state.

## Filtering (feed ingestion)
- URLs containing `/admin/`, `/mod/`, `/staff/`, `/login`, `/register` should be excluded from feed entries.
- Link normalization uses `absoluteUrl(base, href)` to resolve relative URLs against the feed URL.