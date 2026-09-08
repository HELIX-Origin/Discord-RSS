# Rule 02: TypeScript & GitHub Actions Source Conventions

## Mandatory Source Layout

```
Site-Feed-Discord/
├── src/
│   ├── index.ts                        # Main entry point
│   ├── handlers/
│   │   ├── feed.ts                      # Feed handler module
│   │   └── status.ts                    # Status handler module
│   ├── modules/
│   │   ├── feed-discovery.ts            # Feed URL discovery module
│   │   └── webhook.ts                   # Webhook module
│   ├── functions/
│   │   ├── atomic-write.ts              # Atomic state file writes
│   │   ├── webhook-loader.ts            # Webhook URL scanning (`{SERVICE_NAME}_WEBHOOK_URL_{###}`)
│   │   ├── feed-loader.ts               # Feed URL scanning (`{SOURCE}_RSS_URL_{###}`)
│   │   └── filter.ts                    # Filtering logic
│   └── types/
│       └── index.ts                     # TypeScript type definitions
├── tests/
│   └── test_post_feed_to_discord.py     # Unit tests (Python, or updated TypeScript tests)
├── docs/
│   ├── README.md                        # Documentation index
│   ├── 01-overview.md
│   ├── 02-setup-and-configuration.md
│   ├── 03-vbulletin-support.md
│   ├── 04-status-monitoring.md
│   └── 05-troubleshooting.md
├── .github/
│   ├── workflows/
│   │   ├── post-feed-to-discord.yml     # Scheduled feed job
│   │   └── site-status-alert.yml        # Status monitor job
│   ├── feed-state.json                  # Last-seen feed entries
│   └── site-status-state.json           # Online/offline state
└── .agents/
    └── (Agent rules, bugs, plans, skills, templates, opencode)
```

## TypeScript Conventions
- Use strict TypeScript (`tsconfig.json` with `"strict": true`).
- All feed parsing must handle network errors gracefully (`fetch` or `urllib.request` fallbacks in transition phase).
- When targeting Cloudflare-protected domains, external API (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`) or `playwright` is permitted. All automation must fall back to `urllib.request` when no challenge markers are present.
- State files must be read/written atomically (`os.rename()` or `fs.renameSync()` equivalent in TypeScript node environment, or atomic `.tmp` + rename pattern).
- All webhook URLs loaded exclusively from **GitHub Secrets** using `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming.
- All feed URLs loaded exclusively from **GitHub Secrets** using `{SOURCE}_RSS_URL_{###}` naming.
- Discohook (`DISCOHOOK_WEBHOOK_URL_001`) is the primary/default webhook method.

## GitHub Actions Conventions
- Every workflow must declare `name:`, `on:` (with `schedule:` for cron), `jobs:`, and a `concurrency:` group.
- Workflows must reference repository secrets explicitly via `${{ secrets.XXX }}`.
- Scripts executed via `node` or compiled TypeScript (`npm run build` + `node dist/index.js`).
