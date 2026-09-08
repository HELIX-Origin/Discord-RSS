# Discord Webhook Skill

## Webhook Storage
All webhook URLs are stored in `.env` using the naming pattern:

```
{SERVICE_NAME}_WEBHOOK_URL_{###}
```

Where:
- `{SERVICE_NAME}` = service identifier (`DISCOHOOK`, `DISCORD`, `SITE_STATUS`, `CUSTOM_SERVICE`)
- `{###}` = three-digit number starting at `001` (`001`, `002`, `003`...)

## Examples
- `DISCOHOOK_WEBHOOK_URL_001`
- `DISCOHOOK_WEBHOOK_URL_002`
- `SITE_STATUS_WEBHOOK_URL_001`
- `CUSTOM_SERVICE_WEBHOOK_URL_001`

## Script Discovery Pattern
Scripts scan `.env` variables for the `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern and load sequentially from `001` upward.

## Payload Construction
```json
{
  "embeds": [
    {
      "title": "Post Title",
      "url": "https://example.com/post",
      "author": {"name": "Author Name"},
      "description": "Summary...",
      "timestamp": "2026-09-07T12:00:00Z",
      "color": 3447003
    }
  ]
}
```

## Rules (Rule 03 Compliance)
- All payload construction must occur inside `src/handlers/feed.ts` or `src/handlers/status.ts`.
- Never embed webhook URLs directly in source; load from `.env` only.
- Status embeds must use `color`: `65280` (green) for online, `16711680` (red) for offline.
- `.env` must never be committed to the repository.
