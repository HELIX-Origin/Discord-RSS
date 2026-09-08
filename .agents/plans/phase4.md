# Phase 4 — Status Monitor & Alert Transitions

## Goals
Separate workflow and script for site status with transition-only alerts using GitHub Secrets webhook naming.

## Sub-Issues
- [x] `.github/workflows/site-status-alert.yml` scheduled every 30 minutes
- [x] `post_site_status.py` reads `.github/site-status-state.json`
- [x] Webhook (`SITE STATUS WEBHOOK URL {###}`) fires only on `online` <-> `offline` transition
- [x] False-positive suppression with retry logic
- [x] Script uses `load_webhook_urls()` from updated feed module

## Verification
- [x] Manual trigger produces no webhook when state unchanged.
- [x] Manual trigger with site down produces red embed webhook.
