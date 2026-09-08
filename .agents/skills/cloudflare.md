# Cloudflare & Challenge Resolution Skill

## Challenge Detection
The feed/status fetch path (`src/feed/fetch.ts`) detects Cloudflare challenge pages by scanning response content for markers:
- `cloudflare`, `cf-challenge`, `cf-turnstile`, `jschl`
- `checking your browser`, `why am i seeing this`
- `just a moment`, `verify you are human`, `ray id`
- `captcha`, `managed challenge`, `challenge-platform`
- `please enable javascript`, `attention required`, `ddos protection`

`isCloudflareChallenge(contentType, url)` is the shared detection helper used by the feed watcher.

## Browser Automation (`playwright`)
When a challenge is detected (the `fetch` path returns 403/429 with challenge markers), the wiring may use a browser-assisted path:
- `playwright` is permitted for Cloudflare (`Rule 01`)
- Returns the resolved page content for the scrape/parse pipeline
- Must fall back to native `fetch` when no challenge is detected

## External API Awareness
If `playwright` is unavailable or insufficient, third-party challenge-solving APIs **only** when:
1. The site is confirmed protected (response contains challenge markers).
2. The user explicitly approves the external service by storing the key/endpoint in `.env` (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`). Keys must never be committed to source.
3. The service endpoint, API key, or session token is never committed to source.
4. The fallback behavior (native `fetch`) remains intact when no challenge is detected.

## Safety Requirements (Rule 01 & Rule 00)
- Never log browser cookies, session storage, or challenge tokens.
- Never commit `.env` values containing external API credentials.
- `.env` is loaded via `node --env-file-if-exists=.env` (Node >=22.9) — no `dotenv`.
- `playwright` is used only for Cloudflare challenge resolution.