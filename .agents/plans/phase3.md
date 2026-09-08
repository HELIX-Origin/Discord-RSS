> [!IMPORTANT]
> **LEGACY** — This phase describes the superseded Site-Feed-Discord Python/Discohook plan. See [roadmap.md](roadmap.md) and the live tracking at GitHub Issue #4.
> 
# Phase 3 — Webhook Formatting & Embed Engine

## Goals
Centralize all Discord embed construction within TypeScript handlers using `.env` / secret webhook naming (`{SERVICE_NAME}_WEBHOOK_URL_{###}`).

## Sub-Issues
- [x] Build embed payload function for feed posts (`src/handlers/feed.ts`)
- [x] Build embed payload function for status transitions (`src/handlers/status.ts`)
- [x] Loader loads webhooks from `.env`/secrets using `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern (`src/functions/webhook-loader.ts`)
- [x] Multiple webhook sequential loading (`001`, `002`, etc.) implemented
- [x] Verify Rule 03 compliance across `.agents/` and `src/`

## Verification
```bash
npm run build
npm test
```