> [!IMPORTANT]
> **LEGACY** — This phase describes the superseded Site-Feed-Discord Python/Discohook plan. See [roadmap.md](roadmap.md) and the live tracking at GitHub Issue #4.
> 
# Phase 4 — Status Monitor & Alert Transitions

## Goals
Status handler (`src/handlers/status.ts`) with transition-only alerts using `.env` / secret webhook naming.

## Sub-Issues
- [x] Status handler reads `.github/site-status-state.json`
- [x] Webhook (`SITE_STATUS_WEBHOOK_URL_001`) fires only on `online` <-> `offline` transition
- [x] False-positive suppression with retry logic
- [x] Handler uses `loadWebhookUrls()` from `src/functions/webhook-loader.ts`

## Verification
- [x] Manual run produces no webhook when state unchanged.
- [x] Manual run with site down produces red embed webhook.