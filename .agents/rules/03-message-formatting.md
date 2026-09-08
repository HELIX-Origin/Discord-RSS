# Rule 03: Centralized Message & Webhook Formatting

## Mandatory Invariants
1. **Single Source of Truth for Discord Payloads**: All webhook message payloads (embed arrays, title, description, color, author, footer) must be constructed within the Python script (`post_feed_to_discord.py` or `post_site_status.py`). No inline raw webhook JSON must exist in `.github/workflows/*.yml`, docs, templates, or other files.
2. **No Hardcoded URLs**: Webhook URLs must be loaded exclusively from **GitHub Secrets** using the naming pattern `{SERVICE_NAME} WEBHOOK URL {###}` (e.g., `DISCORD WEBHOOK URL 001`, `SITE STATUS WEBHOOK URL 001`, `CUSTOM SERVICE WEBHOOK URL 002`). They must never appear as `.env` examples, hardcoded strings, or literal values in Python source.
3. **Embed Formatting Rules**: Each feed embed must include `title`, `url`, `author`, `timestamp`. Status embeds must include `title` (Online/Offline transition), `color` (green/red), and `description` (site URL and timestamp).
4. **Multiple Webhook Support**: Scripts must scan for `{SERVICE_NAME} WEBHOOK URL {###}` sequentially starting at `001`. Additional webhooks (`002`, `003`, etc.) must be loaded in numeric order when multiple targets are configured.
