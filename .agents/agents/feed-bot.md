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

### 4. Discord Webhook (GitHub Secrets Naming)
- Load webhook URLs exclusively from **GitHub Secrets** using the `{SERVICE_NAME} WEBHOOK URL {###}` pattern.
- Example secrets:
  - `DISCORD WEBHOOK URL 001`
  - `DISCORD WEBHOOK URL 002`
  - `CUSTOM SERVICE WEBHOOK URL 001`
- Build JSON payload with `json.dumps()`.
- Send via `urllib.request.Request(url, data=body.encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')`.
- Scripts scan from `001` upward and load sequentially when multiple targets exist.

## Required Environment Variables / GitHub Secrets

| Secret Name | Purpose |
|-------------|---------|
| `SITE_URL` | Base site URL for feed/status monitoring |
| `FEED_URL` / `FEED_URLS` | Optional override feed URLs |
| `DISCORD WEBHOOK URL 001` | Main feed post webhook |
| `DISCORD WEBHOOK URL 002` | Additional feed webhook (optional) |
| `SITE STATUS WEBHOOK URL 001` | Status transition alert webhook |
| `SITE STATUS WEBHOOK URL 002` | Additional status webhook (optional) |
