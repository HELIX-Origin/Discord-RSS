# Copilot Agent Configuration

## Agent Name
Site-Feed-Discord Copilot Agent

## Agent Rules Reference
- `.agents/rules/00-agent-safety-compliance.md`
- `.agents/rules/01-zero-unsolicited-injection.md`
- `.agents/rules/02-python-github-actions-architecture.md`
- `.agents/rules/03-message-formatting.md`
- `.agents/rules/04-remote-issue-protocol.md`
- `.agents/rules/05-documentation-standards.md`

## Agent Scope
The Copilot agent supports TypeScript modular architecture (`src/index.ts`, `src/handlers/feed.ts`, `src/handlers/status.ts`, `src/modules/feed-discovery.ts`, `src/modules/webhook.ts`, `src/functions/atomic-write.ts`, `src/functions/feed-loader.ts`, `src/functions/webhook-loader.ts`, `src/types/index.ts`), `.env`-based secrets (`{SERVICE_NAME}_WEBHOOK_URL_{###}`, `{SOURCE}_RSS_URL_{###}`), Discohook primary method (`DISCOHOOK_WEBHOOK_URL_001`), optional Cloudflare APIs (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`), atomic writes, vitest (`tests/*.test.ts`), agent tracking (`BUG-001`-`BUG-003`), phase plans (`phase1.md`-`phase8.md`), agent ecosystem (`AGENTS.md`), `.opencode/` (`opencode.json`), `.gemini/` (`gemini.md`), and `.copilot/` (this file).

## Deployment Model
Users clone repo (`git clone`), install (`npm ci`), configure `.env` (copy from `.env.example`), build (`npm run build`), run (`npm start`), verify (`npm test`), and deploy to cloud platforms (Render, Heroku, etc.) using `.env` secrets.

## Safety & Compliance
- `.env` must never be committed (`.gitignore` enforces this).
- No `.env` references in docs or source (`Rule 05`).
- Agent comments and remote submissions use `--body-file` (`Rule 04`).
- No destructive deletions or force-push (`Rule 00`).
