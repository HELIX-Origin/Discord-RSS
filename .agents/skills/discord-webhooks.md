# Discord Webhook Skill

## Webhook Storage
All webhook URLs are stored exclusively in **GitHub Secrets**. There is no `.env` file or source-embedded webhook URL. Multiple webhooks use the naming pattern:

```
{SERVICE_NAME} WEBHOOK URL {###}
```

Where:
- `{SERVICE_NAME}` = the service identifier (e.g., `DISCORD`, `SITE_STATUS`, `CUSTOM_SERVICE`)
- `{###}` = a three-digit number starting at `001` and incrementing per webhook (`001`, `002`, `003`...)

## Examples
- `DISCORD WEBHOOK URL 001`
- `DISCORD WEBHOOK URL 002`
- `SITE STATUS WEBHOOK URL 001`
- `SITE STATUS WEBHOOK URL 002`
- `CUSTOM SERVICE WEBHOOK URL 001`

## Webhook Types
- Main feed post webhook (`DISCORD WEBHOOK URL 001`): rich embeds for new feed entries.
- Status transition webhook (`SITE STATUS WEBHOOK URL 001`): online/offline alerts.
- Additional webhooks (`DISCORD WEBHOOK URL 002`+) for extra channels, backups, or custom integrations.

## Script Discovery Pattern
Scripts must scan secrets for the `{SERVICE_NAME} WEBHOOK URL {###}` pattern and load the first matching URL. If multiple URLs are required, the script must load sequentially from `001` upward until no more secrets match.

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
- Never embed webhook URLs directly in Python source; read from **GitHub Secrets** using the `{SERVICE_NAME} WEBHOOK URL {###}` naming convention only.
- Status embeds must use `color`: `65280` (green) for online, `16711680` (red) for offline.
- Any `.env` reference in documentation must be replaced with instructions to use GitHub Secrets.
