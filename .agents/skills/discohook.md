# Discohook Skill

## Overview
Discohook (`https://discohook.app`) is an optional external service for formatting Discord message embeds and managing webhooks. The repository may optionally use Discohook-style embed formatting or send messages through a Discohook-managed webhook.

## Naming Convention (GitHub Secrets)
If using Discohook as a separate webhook target, secrets must follow the underscore naming pattern:
- `DISCOHOOK_WEBHOOK_URL_001` — primary Discohook webhook
- `DISCOHOOK_WEBHOOK_URL_002` — additional Discohook webhook (optional)

## Optional Usage
Discohook support is optional and never required for basic operation. When enabled:
1. The user configures `DISCOHOOK_WEBHOOK_URL_{###}` secrets.
2. The script optionally builds embeds with Discohook-compatible formatting (rich fields, colors, timestamps, images).
3. The message payload remains standard Discord webhook JSON (compatible with both native Discord and Discohook-managed webhooks).

## Safety Requirements (Rule 01 & 00)
- Any Discohook webhook URLs must be stored exclusively in **GitHub Secrets** using `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming.
- No `.env` files or source files may contain Discohook URLs or tokens.
- Discohook formatting is optional; native embed formatting (`build_discord_message`) remains the default.
