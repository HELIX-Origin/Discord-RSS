# Opencode Agents

This file documents the agent configurations for **Discord RSS** in the `.opencode/` ecosystem. The real agent definitions live in `.agents/agents/*.md` (shared universal conventions; ecosystem-specific shells are being rebuilt).

## Agent Definitions (authoritative: `.agents/`)

| Agent | Role | File |
|-------|------|------|
| `feed-watcher` | Poll all user feeds, dedupe (AppState + optional Redis), direct Discord webhook delivery, scrape branch | [`.agents/agents/feed-watcher.md`](../agents/feed-watcher.md) |
| `status-monitor` | Availability polling, transition-only alerts, per-user webhook delivery | [`.agents/agents/status-monitor.md`](../agents/status-monitor.md) |

## Key Rules (universal, `.agents/rules/`)
- `agent-safety-compliance.md` (Rule 00), `zero-unsolicited-injection.md` (Rule 01), `typescript-architecture.md` (Rule 02), `message-formatting.md` (Rule 03), `remote-issue-protocol.md` (Rule 04), `documentation-standards.md` (Rule 05)

## Skills (universal, `.agents/skills/`)
`typescript.md`, `rss-atom.md`, `discord-webhooks.md`, `web-basics.md`, `cloudflare.md`, `code-hosting-platforms.md`

## Verification
`npm run build` + `npx tsc --noEmit` (and `npm test` when a suite exists).