# Commit Message Guide

## Format
```
[type]: [component] short description

Body explaining the fix, feature, or change (optional).
Reference BUG-XXX or GitHub Issue #N if applicable.
```

## Types
- `fix:` — Bug fix (`BUG-001`, `BUG-002`)
- `feat:` — New script or workflow feature
- `docs:` — Documentation updates
- `test:` — Unit test additions
- `refactor:` — Code restructuring without behavior change

## Component Tags
- `[feed]` — `post_feed_to_discord.py`
- `[status]` — `post_site_status.py`
- `[workflows]` — `.github/workflows/*.yml`
- `[state]` — `.github/feed-state.json`, `.github/site-status-state.json`
- `[docs]` — `docs/`
- `[agents]` — `.agents/`
