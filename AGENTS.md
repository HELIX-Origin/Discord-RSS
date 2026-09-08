# AGENTS

This file serves as the entry point for all AI agents, coding assistants, and automated agents working on this repository.

## Agent Ecosystems

- `.opencode/` — Opencode agent configurations (`opencode.json`), skills (`skills/`), plans (`plans/`), rules (`rules/`), bugs (`bugs/`), templates (`templates/`), and agent definitions (`agents/`).
- `.gemini/` — Gemini agent configurations (`gemini.md`), skills, rules, bugs, plans, and agent definitions for Gemini-powered automation.
- `.copilot/` — Copilot agent configurations (`copilot.md`), rules, bugs, skills, templates, and agent definitions for GitHub Copilot integration.
- `.agents/` — Universal agent conventions (`rules/`, `skills/`, `bugs/`, `plans/`, `templates/`, `agents/`, `opencode/`) that apply across all agent systems (`.opencode/`, `.gemini/`, `.copilot/`).

## Universal Agent Rules (`.agents/`)

All agent systems (`.opencode/`, `.gemini/`, `.copilot/`, `.agents/`) must comply with `.agents/rules/`:

- `00-agent-safety-compliance.md` — Safety invariants, zero irreversible damage, secrets protection, external API safety (`CLOUDFLARE_API_KEY` must remain in `.env` / secrets, never committed).
- `01-zero-unsolicited-injection.md` — Zero external framework injection (only native TypeScript / standard libraries unless explicitly approved; Discohook as optional external service permitted; `playwright` permitted for Cloudflare; `dotenv` permitted for `.env`).
- `02-python-github-actions-architecture.md` — TypeScript & GitHub Actions architecture (`src/index.ts`, `src/handlers/`, `src/modules/`, `src/functions/`, `src/types/`); `tsconfig.json`; `package.json`.
- `03-message-formatting.md` — Webhook/secret naming (`{SERVICE_NAME}_WEBHOOK_URL_{###}` for `.env` or secrets), embed formatting, multiple webhook support (`001`, `002`, etc.), `.env` storage preferred over secrets for cloud hosting (Render, Heroku, etc.); no `.env` file committed.
- `04-remote-issue-protocol.md` — Remote issue protocol (GitHub Issues mirror, sub-issue decomposition, Mermaid diagrams mandatory, body-file submissions via `--body-file`).
- `05-documentation-standards.md` — Documentation standards (`docs/README.md` index, `.env.example` reference, agent documentation sync, no uncommitted secret docs).

## Agent Definitions

- `.agents/agents/feed-bot.md` — Feed monitoring agent (TypeScript, Discohook webhook primary, `{SOURCE}_RSS_URL_{###}` feed secrets, `.env` based).
- `.agents/agents/status-monitor.md` — Status monitoring agent (`SITE_STATUS_WEBHOOK_URL_001`, `.env` based, TypeScript, atomic writes).

## Agent Tracking

- `.agents/bugs/` — Tracked bugs (`BUG-001` atomic writes, `BUG-002` encoding, `BUG-003` Cloudflare external API).
- `.agents/plans/` — Roadmap (`roadmap.md`) and phases (`phase1.md` through `phase8.md`).
- `.agents/skills/` — Technical skills (`python.md`, `rss-atom.md`, `discord-webhooks.md`, `github-actions.md`, `cloudflare.md`, `discohook.md`, etc.).

## Usage

All agent updates, bug reports, feature requests, and documentation changes must reference `.agents/` rules. No file operations outside `D:\Projects\Site-Feed-Discord` (or current repo root) permitted (`Rule 00`).
