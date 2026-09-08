# Agents Index

This directory contains specialized agent files for Discord RSS project domains. Each agent definition details domain architecture, source locations, environment requirements, and integration guidelines.

> The project was previously named **Site-Feed-Discord** (Discohook-based, single-site scripts). The rebuild is the multi-user TypeScript **Discord RSS** service. Old agent references to Discohook, `.github/feed-state.json`, and `{SOURCE}_RSS_URL_{###}` env naming are obsolete.

## Available Agents

| Agent | Target Domain | Description | Agent File |
|-------|--------------|-------------|------------|
| **feed-watcher** | Feed polling (`src/feed/watcher.ts`) | Poll all user feeds, dedupe (AppState + optional Redis), direct Discord webhook delivery, scrape branch | [feed-watcher.md](feed-watcher.md) |
| **status-monitor** | Site status (`src/status/watcher.ts`) | Availability polling, transition-only alerts, per-user webhook delivery | [status-monitor.md](status-monitor.md) |

## Related Domains (not stand-alone agents)

| Domain | Files | Purpose |
|--------|-------|---------|
| Webhook delivery | `src/webhook/discord.ts` | Direct Discord POST + retry; `feedEmbed` builder |
| AppState | `src/state/*` | In-memory primary layer over SQLite; optional Redis coordinator |
| Persistence | `src/db/*` | `node:sqlite` schema + write-through repository |
| Auth & OAuth | `src/auth/*`, `src/oauth/*` | Email+password sessions; provider OAuth (Cloudflare) |
| Dashboard & API | `src/http/*`, `src/server.ts` | Built-in UI + JSON API |

## Usage
When working within the Discord RSS repository, reference the corresponding agent file to guide changes to watchers, webhook delivery, state handling, and testing conventions.