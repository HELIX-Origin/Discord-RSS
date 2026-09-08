# Phase 3 — Webhook Formatting & Embed Engine

## Goals
Centralize all Discord embed construction within Python scripts using GitHub Secrets webhook naming (`{SERVICE_NAME}_WEBHOOK_URL_{###}`).

## Sub-Issues
- [x] Build embed payload function for feed posts (`post_feed_to_discord.py`)
- [x] Build embed payload function for status transitions (`post_site_status.py`)
- [x] Script loads webhooks from GitHub Secrets using `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern
- [x] Multiple webhook sequential loading (`001`, `002`, etc.) implemented
- [x] Verify Rule 03 compliance across `.agents/` and `scripts/`

## Verification
```bash
python -m unittest discover -s tests -p "test_*.py"
```
