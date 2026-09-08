# Rule 03: Centralized Message & Webhook Formatting

## Mandatory Invariants
1. **Single Source of Truth for Discord Payloads**: All Discord message payloads (embeds, title, description, color, author, timestamp) are constructed in `src/webhook/discord.ts` (`feedEmbed`) and delivered by `sendWebhook`. No inline raw webhook JSON elsewhere in source, docs, or templates.
2. **Webhooks Are Per-User Rows in SQLite**: Webhook URLs are dashboard-managed records (`webhooks` table), one row per user — never env vars. Env-secret naming like `{SERVICE_NAME}_WEBHOOK_URL_{###}` no longer applies to this project.
3. **Embed Formatting Rules**: Feed embeds include `title`, `url`, `author`, `timestamp`. Status transition embeds include `title` (down/back-online), `color` (green/red), and `description` (site URL + detail).
4. **Direct-to-Discord Delivery**: `sendWebhook` POSTs directly to the Discord webhook URL (path contains the credential `id/token`). No Discohook, no third-party forwarding.
5. **Env Prefix**:
   - Runtime/env variables use `DISCORD_RSS_*` (host, port, data dir, intervals, redis URL, public base URL).
   - OAuth provider client-id/secret are stored in the SQLite `settings` table (Integrations tab), not env vars.

## Delivery
- `src/webhook/discord.ts` — `sendWebhook(url, payload)` with retry loop (5 attempts, 5xx backoff, 429 `Retry-After` capped), `feedEmbed(...)`, URL redaction in errors.