# Status Monitor Agent

This agent defines conventions, architecture, and command references for the Site-Feed-Discord site status monitoring automation.

## Architecture & Structure

```
Site-Feed-Discord/
├── scripts/
│   └── post_site_status.py        # Status polling logic
├── .github/
│   ├── workflows/
│   │   └── site-status-alert.yml   # Scheduled status job
│   └── site-status-state.json      # Online/offline state
└── .agents/
    └── agents/
        └── status-monitor.md        # This file
```

## Setup & Workflow Commands

```bash
# Validate status script
python scripts/post_site_status.py

# Trigger status workflow
gh workflow run site-status-alert.yml
```

## Key Patterns

### 1. Availability Check (`post_site_status.py`)
- Read `SITE_URL` from environment.
- Send `urllib.request.urlopen(SITE_URL, timeout=10)`.
- If `HTTPResponse.status == 200` and no exception: site is **online**.
- Any exception (`URLError`, timeout, non-200 status): site is **offline**.
- When behind a Cloudflare challenge, `fetch_via_http()` or `fetch_via_browser()` handles detection and resolution via `playwright` or an optional external API configured via GitHub Secrets.

### 2. State Persistence
- Read `.github/site-status-state.json` to get previous state (`{"status": "online", "last_checked": "..."}`).
- Only send webhook if `current_state != previous_state` (transition only).

### 3. Discord Webhook (GitHub Secrets Naming)
- Load webhook URLs exclusively from **GitHub Secrets** using the `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern.
- Example secrets:
  - `SITE_STATUS_WEBHOOK_URL_001`
  - `SITE_STATUS_WEBHOOK_URL_002`
- Build embed payload:
  - Title: `Site Status: Online` or `Site Status: Offline`
  - Color: `65280` (green) for online, `16711680` (red) for offline
  - Description: `SITE_URL` and timestamp
- Scripts scan from `001` upward and load sequentially.

### 4. False-Positive Suppression
- Before marking offline, retry once after a 5-second delay.
- If the retry succeeds, keep previous online state and do not fire webhook.

## Required Environment Variables / GitHub Secrets

| Secret Name | Purpose |
|-------------|---------|
| `SITE_URL` | Base site URL for status monitoring |
| `SITE_STATUS_WEBHOOK_URL_001` | Status transition alert webhook |
| `SITE_STATUS_WEBHOOK_URL_002` | Additional status webhook (optional) |
