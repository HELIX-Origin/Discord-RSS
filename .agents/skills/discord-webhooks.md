# Discord Webhook Skill

## Webhook Storage
Webhook URLs are **per-user rows in SQLite**, managed from the dashboard (Webhooks tab) and persisted via the write-through repository. They are stored in the `webhooks` table (`user_id`, `name`, `url`, `enabled`, `created_at`).

They are **NOT** env vars. Env-based naming like `{SERVICE_NAME}_WEBHOOK_URL_{###}` no longer applies.

## Webhook URL Format
Discord webhook URLs are a fully self-contained credential:
```
https://discord.com/api/webhooks/{id}/{token}
```
No Discord developer-app token/OAuth is needed; the URL itself authenticates.

## Payload Construction (`src/webhook/discord.ts`)
```ts
const embed = feedEmbed({
  title: 'Post Title',
  url: 'https://example.com/post',
  description: 'Summary...',
  author: 'Author Name',
  publishedAt: '2026-09-07T12:00:00Z',
  feedTitle: 'Feed Name',
  color: 0x06b6d4,
});
const result = await sendWebhook(webhookUrl, { username: 'Feed Name', embeds: [embed] });
```

## Delivery Semantics
- Direct `POST` to the Discord API; 5 attempts; exponential backoff on 5xx; honors 429 `Retry-After` (capped 15s).
- `sendWebhook` redacts the token portion from error messages.
- URL from the `webhooks` row is returned to the dashboard as-is; the mailbox never renders the token.

## Rules (Rule 03 Compliance)
- All payload construction lives in `src/webhook/discord.ts`; sent via `sendWebhook`.
- Webhook records are dashboard-managed SQLite rows — never hardcoded, never env vars.
- Status transition embeds use `color`: `0x22c55e` (back online) / `0xef4444` (down).
- `.env` must never be committed (Rule 00 / Rule 05); `.env` only carries `DISCORD_RSS_*` service settings.