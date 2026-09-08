# Discohook Skill

## Overview
Discohook (`https://discohook.app`) is the primary method used for formatting Discord message embeds and sending posts. The repository uses Discohook-style embed formatting as the default. Users must invite the Discohook bot (`https://discohook.app/bot`) to their Discord server and configure the webhook via GitHub Secrets.

## Naming Convention (GitHub Secrets)
Secrets must follow the underscore naming pattern:
- `DISCOHOOK_WEBHOOK_URL_001` — primary Discohook webhook
- `DISCOHOOK_WEBHOOK_URL_002` — additional Discohook webhook (optional)

## Required Usage
Discohook is the default method:
1. The user must invite the Discohook bot to their Discord server (`https://discohook.app/bot`).
2. Configure `DISCOHOOK_WEBHOOK_URL_{###}` secrets.
3. The script builds embeds using Discohook-compatible formatting (rich fields, colors, timestamps, images) and sends via Discohook webhook.

The native `build_discord_message()` remains available as a fallback only when Discohook URLs are not configured.

## Safety Requirements (Rule 01 & 00)
- Any Discohook webhook URLs must be stored exclusively in **GitHub Secrets** using `{SERVICE_NAME}_WEBHOOK_URL_{###}` naming.
- No `.env` files or source files may contain Discohook URLs or tokens.
- Discohook bot invitation is a user action outside this repository's scope but is documented as mandatory for operation.
