# Rule 02: Python & GitHub Actions Source Conventions

## Mandatory Source Layout

```
Site-Feed-Discord/
├── scripts/
│   ├── post_feed_to_discord.py       # Main feed logic
│   └── post_site_status.py            # Status logic
├── tests/
│   └── test_post_feed_to_discord.py   # Unit tests
├── docs/
│   ├── README.md                      # Documentation index
│   ├── 01-overview.md
│   ├── 02-setup-and-configuration.md
│   ├── 03-vbulletin-support.md
│   ├── 04-status-monitoring.md
│   └── 05-troubleshooting.md
├── .github/
│   ├── workflows/
│   │   ├── post-feed-to-discord.yml   # Scheduled feed job
│   │   └── site-status-alert.yml      # Status monitor job
│   ├── feed-state.json                # Last-seen feed entries
│   └── site-status-state.json         # Online/offline state
└── .agents/                           # Agent rules, bugs, plans
```

## Python Conventions
- Use type hints (`def parse_feed(url: str) -> list[dict]: ...`).
- All feed parsing must handle `urllib.error.URLError` gracefully.
- When targeting Cloudflare-protected domains, `fetch_via_browser()` using `playwright` is permitted. All browser automation must be isolated, must not leak session/cookie data, and must fall back to `urllib.request` when no challenge markers (`cf-challenge`, `cf-turnstile`, `managed challenge`) are present.
- State files must be read/written with `json.load` / `json.dump` using explicit `indent=2`.

## GitHub Actions Conventions
- Every workflow must declare `name:`, `on:` (with `schedule:` for cron), `jobs:`, and a `concurrency:` group.
- Workflows must reference repository secrets explicitly via `${{ secrets.XXX }}`.
