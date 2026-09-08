# Phase 2 — Python Scripts & State Management

## Goals
Ensure `scripts/post_feed_to_discord.py` and `scripts/post_site_status.py` handle state correctly and are covered by tests.

## Sub-Issues
- [x] Main feed script with standard library only
- [x] Status script with webhook formatting
- [x] `.github/feed-state.json` persistence
- [x] `.github/site-status-state.json` persistence
- [ ] Atomic file writes
- [ ] Concurrent-run protection (`BUG-001` fix)

## Verification
```bash
python -m unittest discover -s tests -p "test_*.py"
```
