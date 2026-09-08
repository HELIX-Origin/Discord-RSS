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
- Read `FEED_URL` or `FEED_URLS` from secrets; fallback to `/feed`, `/rss`, `/feed.xml`, `/atom.xml`.
- Fetch with `urllib.request.urlopen(url, timeout=10)`.
- Parse with `xml.etree.ElementTree`.

### 2. Filtering
- Skip entries without a `<link>` or with URLs containing excluded paths (`/admin/`, `/mod/`, `/staff/`).
- Only include entries where the link domain matches `SITE_URL`.
- Skip entries older than the newest in `.github/feed-state.json`.

### 3. State Persistence
- Read `.github/feed-state.json` at script start.
- After posting, write updated state atomically (`os.rename()` pattern preferred).

### 4. Discord Webhook (GitHub Secrets Naming) + Optional Discohook
- Load webhook URLs exclusively from **GitHub Secrets** using `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern.
- Optional Discohook webhook (`DISCOHOOK_WEBHOOK_URL_001`) may be used for enhanced embed formatting (`.agents/skills/discohook.md`).
- Scripts scan from `001` upward and load sequentially.
- Example secrets:
  - `DISCORD_WEBHOOK_URL_001`
  - `DISCORD_WEBHOOK_URL_002`
  - `CUSTOM_SERVICE_WEBHOOK_URL_001`
- Build JSON payload with `json.dumps()`.
- Send via `urllib.request.Request(url, data=body.encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')`.
- Scripts scan from `001` upward and load sequentially when multiple targets exist.

## Required Environment Variables / GitHub Secrets

| Secret Name | Purpose |
|-------------|---------|
| `SITE_URL` | Base site URL for feed/status monitoring |
| `FEED_URL` / `FEED_URLS` | Optional override feed URLs |
| `DISCORD_WEBHOOK_URL_001` | Main feed post webhook |
| `DISCORD_WEBHOOK_URL_002` | Additional feed webhook (optional) |
| `SITE_STATUS_WEBHOOK_URL_001` | Status transition alert webhook |
| `SITE_STATUS_WEBHOOK_URL_002` | Additional status webhook (optional) |
