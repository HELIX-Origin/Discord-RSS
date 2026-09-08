# Feed Bot Agent

This agent defines conventions, architecture, and command references for the Site-Feed-Discord feed monitoring automation.

## Architecture & Structure

```
Site-Feed-Discord/
├── src/
│   ├── index.ts                        # Main TypeScript entry
│   ├── handlers/
│   │   ├── feed.ts                      # Feed handler
│   │   └── status.ts                    # Status handler
│   ├── modules/
│   │   ├── feed-discovery.ts            # Feed URL discovery
│   │   └── webhook.ts                   # Webhook module
│   ├── functions/
│   │   ├── atomic-write.ts              # Atomic state writes
│   │   ├── webhook-loader.ts            # Webhook scanning (`{SERVICE_NAME}_WEBHOOK_URL_{###}`)
│   │   └── feed-loader.ts               # Feed scanning (`{SOURCE}_RSS_URL_{###}`)
│   └── types/
│       └── index.ts                     # TypeScript types
├── .github/
│   ├── workflows/
│   │   └── ci.yml                       # CI code scan workflow (replaces scheduled workflows)
│   └── feed-state.json             # Persisted state
├── docs/
│   └── README.md
└── .agents/
    └── agents/
        └── feed-bot.md              # This file
```

## Setup & Workflow Commands

```bash
# Build TypeScript
npm run build

# Run TypeScript entry
npm start

# Trigger CI scan (replaces manual workflow triggers)
gh workflow run ci.yml
```

## Key Patterns

### 1. Feed Discovery (`src/handlers/feed.ts` / `src/modules/feed-discovery.ts`)
- Read `SITE_URL` from environment.
- Read `{SOURCE}_RSS_URL_{###}` from secrets; fallback to `/feed`, `/rss`, `/feed.xml`, `/atom.xml`.
- Fetch with standard HTTP client (timeout enabled).
- Parse with standard RSS/Atom parser.

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
- Build JSON payload using TypeScript `JSON.stringify()`.
- Send via standard HTTP POST (`Request` or `fetch`).
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
