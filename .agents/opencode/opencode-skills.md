# Opencode Skills

This file maps skill references for Discord RSS agents. Skills are defined under `.agents/skills/` (universal) and referenced by ecosystem agents.

| Skill | Agent Usage | Key Patterns |
|-------|-------------|--------------|
| `typescript` | `feed-watcher`, `status-monitor` | Native Node (`node:sqlite`, `fetch`), `--env-file-if-exists`, strict TypeScript, vitest |
| `rss-atom` | `feed-watcher` | Native XML parsing, entry extraction, GUID dedupe, encoding fallbacks |
| `discord-webhooks` | `feed-watcher`, `status-monitor` | Emit construction, direct Discord POST + retry; per-user SQLite webhook rows (not env vars) |
| `web-basics` | `status-monitor` | HTTP status, timeout handling, URL normalization |
| `cloudflare` | Both | Challenge detection, `playwright`, external challenge-solving API (optional) |
| `code-hosting-platforms` | Both | Roadmap-first issue tracking, `.env` deployment |

Obsolete: `discohook` skill removed (direct posting only). Env-secret webhook naming no longer applies.