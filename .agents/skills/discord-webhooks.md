# Discord Webhook Skill

## Webhook Storage
All webhook URLs are stored exclusively in **GitHub Secrets**. There is no `.env` file or source-embedded webhook URL. Multiple webhooks use the naming pattern:

```
{SERVICE_NAME}_WEBHOOK_URL_{###}
```

Where:
- `{SERVICE_NAME}` = the service identifier (e.g., `DISCORD`, `SITE_STATUS`, `CUSTOM_SERVICE`)
- `{###}` = a three-digit number starting at `001` and incrementing per webhook (`001`, `002`, `003`...)

## Examples
- `DISCORD_WEBHOOK_URL_001`
- `DISCORD_WEBHOOK_URL_002`
- `SITE_STATUS_WEBHOOK_URL_001`
- `SITE_STATUS_WEBHOOK_URL_002`
- `CUSTOM_SERVICE_WEBHOOK_URL_001`

## Webhook Types
- Primary Discohook webhook (`DISCOHOOK_WEBHOOK_URL_001`): main feed post webhook (rich embeds). Discohook bot must be invited to the server.
- Additional Discohook webhook (`DISCOHOOK_WEBHOOK_URL_002`): extra feed or backup webhook.
- Status transition webhook (`SITE_STATUS_WEBHOOK_URL_001`): online/offline alerts (optional; may also use Discohook formatting).

## Script Discovery Pattern
Scripts must scan secrets for the `{SERVICE_NAME}_WEBHOOK_URL_{###}` pattern and load the first matching URL. If multiple URLs are required, the script must load sequentially from `001` upward until no more secrets match.

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
- All payload construction must occur inside `scripts/post_feed_to_discord.py` or `scripts/post_site_status.py`.
- Never embed webhook URLs directly in Python source; read from **GitHub Secrets** using the `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming convention only.
- Status embeds must use `color`: `65280` (green) for online, `16711680` (red) for offline.
- Any `.env` reference in documentation must be replaced with instructions to use GitHub Secrets.
