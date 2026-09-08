# Cloudflare & Challenge Resolution Skill

## Challenge Detection
The script detects Cloudflare challenge pages by scanning HTML content for markers:
- `cloudflare`, `cf-challenge`, `cf-turnstile`, `jschl`
- `checking your browser`, `why am i seeing this`
- `just a moment`, `verify you are human`, `ray id`
- `captcha`, `managed challenge`, `challenge-platform`
- `please enable javascript`, `attention required`, `ddos protection`

These markers are defined as `CLOUDFLARE_CHALLENGE_MARKERS` in `scripts/post_feed_to_discord.py`.

## Browser Automation (`playwright`)
When a challenge is detected (`fetch_via_http()` returns 403/429 with challenge markers, or `looks_like_cloudflare_challenge()` is `True`), the script calls `fetch_via_browser()`:

- Uses `playwright.sync_api.sync_playwright`
- Launches headless Chromium (`headless=True`)
- Sets user agent via `browser_headers()`
- Waits for `domcontentloaded` (timeout 60000ms)
- Retries up to 12 times, waiting 5000ms between attempts, checking if challenge markers are removed
- Returns `page.content().encode("utf-8")`

## External API Awareness
If `playwright` is unavailable or insufficient, third-party challenge-solving APIs or external browser automation services may be used **only** when:
1. The site is confirmed protected (`SITE_URL` responds with challenge markers).
2. The user explicitly approves the external service by storing the API key or endpoint in `.env` (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`). Keys must never be committed to source.
3. The service endpoint, API key, or session token is never committed to source.
4. The fallback behavior (standard-library `urllib.request`) remains intact when no challenge is detected.

## Safety Requirements (Rule 01 & 00)
- Never log browser cookies, session storage, or challenge tokens.
- Never commit `.env` values containing external API credentials.
- `certifi` may be used for SSL context but must be handled with `ssl.create_default_context(cafile=certifi.where())`.
