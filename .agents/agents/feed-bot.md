# Feed Bot Agent

This agent defines conventions, architecture, and command references for the Site-Feed-Discord feed monitoring automation.

## Architecture & Structure

```
Site-Feed-Discord/
├── scripts/
│   └── post_feed_to_discord.py    # Main feed logic
├── .github/
│   ├── workflows/
│   │   └── post-feed-to-discord.yml
│   └── feed-state.json             # Persisted state
├── docs/
│   └── README.md
└── .agents/
    └── agents/
        └── feed-bot.md              # This file
```

## Setup & Workflow Commands

```bash
# Validate feed script
python scripts/post_feed_to_discord.py

# Run unit tests
python -m unittest discover -s tests -p "test_*.py"

# Deploy workflow (manual trigger via GitHub UI or gh)
gh workflow run post-feed-to-discord.yml
```

## Key Patterns

### 1. Feed Discovery (`post_feed_to_discord.py`)
- Read `SITE_URL` from environment.
- Read `{SOURCE}_RSS_URL_{###}` from secrets; fallback to `/feed`, `/rss`, `/feed.xml`, `/atom.xml`.
- Fetch with `urllib.request.urlopen(url, timeout=10)`.
- Parse with `xml.etree.ElementTree`.

### 2. Filtering
- Skip entries without a `<link>` or with URLs containing excluded paths (`/admin/`, `/mod/`, `/staff/`).
- Only include entries where the link domain matches `SITE_URL`.
- Skip entries older than the newest in `.github/feed-state.json`.

### 3. State Persistence
- Read `.github/feed-state.json` at script start.
- After posting, write updated state atomically (`os.rename()` pattern preferred).

### 4. Discohook Webhook (GitHub Secrets Naming — Primary Method)
- Load webhook URLs exclusively from **GitHub Secrets** using `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming.
- Default: `DISCOHOOK_WEBHOOK_URL_001` (primary Discohook webhook — requires Discohook bot invitation to server).
- Optional: `DISCOHOOK_WEBHOOK_URL_002` (additional), `SITE_STATUS_WEBHOOK_URL_001` (status).
- Scripts scan from `001` upward and load sequentially.
- Example secrets:
  - `DISCORD_WEBHOOK_URL_001`
  - `DISCORD_WEBHOOK_URL_002`
  - `CUSTOM_SERVICE_WEBHOOK_URL_001`
- Build JSON payload with `json.dumps()`.
- Send via `urllib.request.Request(url, data=body.encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')`.
- Scripts scan from `001` upward and load sequentially when multiple targets exist.

## Required Environment Variables / GitHub Secrets

The Discohook bot must be invited to the server (`https://discohook.app/bot`) before using Discohook webhooks.

| Secret Name | Purpose |
|-------------|---------|
| `SITE_URL` | Base site URL for feed/status monitoring |
| `{SOURCE}_RSS_URL_{###}` | Optional override feed URLs |
| `DISCOHOOK_WEBHOOK_URL_001` | Primary Discohook webhook (requires bot invitation) |
| `DISCOHOOK_WEBHOOK_URL_002` | Additional Discohook webhook (optional) |
| `SITE_STATUS_WEBHOOK_URL_001` | Status transition alert webhook (optional; may also use Discohook) |
