# Gemini Agent Configuration

## Agent Name
Site-Feed-Discord Gemini Agent

## Agent Rules Reference
- `.agents/rules/00-agent-safety-compliance.md`
- `.agents/rules/01-zero-unsolicited-injection.md`
- `.agents/rules/02-python-github-actions-architecture.md` (TypeScript architecture: `src/index.ts`, `src/handlers/`, `src/modules/`, `src/functions/`)
- `.agents/rules/03-message-formatting.md`
- `.agents/rules/04-remote-issue-protocol.md`
- `.agents/rules/05-documentation-standards.md`

## Agent Scope
This Gemini agent supports the same TypeScript modular architecture, `.env`-based secret naming (`{SERVICE_NAME}_WEBHOOK_URL_{###}`, `{SOURCE}_RSS_URL_{###}`), Discohook primary webhook method, optional Cloudflare external APIs (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`), atomic state writes, agent tracking (`BUG-001`-`BUG-003`), phase plans (`Phase 1-8`), and vitest suite.

## Secret Naming Convention
All webhook URLs: `{SERVICE_NAME}_WEBHOOK_URL_{###}` (e.g., `DISCOHOOK_WEBHOOK_URL_001`).
All feed URLs: `{SOURCE}_RSS_URL_{###}` (e.g., `FORUM_RSS_URL_001`).
No `.env` files committed. `.env` stored in `.env.example` and `.gitignore`.

## Safety Invariants (Rule 00 & 01)
- Never log cookies/session data from `playwright` or external APIs.
- Never commit `.env` values.
- No destructive file deletions without authorization (`Rule 00`).
- Zero unsolicited framework injection (`Rule 01`).
