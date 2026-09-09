# Code Hosting Platforms Skill

## GitHub Integration (`gh`)
- Issue creation: `gh issue create --title "[PLAN] ..." --body-file "<roadmap.md>"` for plans, `[BUG-XXX] ...` for bugs.
- **One roadmap per plan (Rule 04)**: each new plan gets its **own** `[PLAN]` issue as that plan's roadmap. A plan issue scopes only its own sub-issues — it is not a global repo roadmap. Starting a new plan = a new `[PLAN]` issue.
- **Roadmap-first tracking**: the first post of an issue is the roadmap; progress edits that post (`gh issue edit <parent> --body-file`). No new posts for roadmap progress; new comments only for newly discovered additions.
- All tracking mirror: `HELIX-Origin/Discord-RSS/issues` (remote `origin` updated to `https://github.com/HELIX-Origin/Discord-RSS.git` after repo rename).

## Deployment
- The project is self-hosted. Runtime configuration is loaded from `.env` (copy `.env.example`) — only `DISCORD_RSS_*` service settings ever appear there. Webhooks, feeds, monitors, and OAuth credentials are stored in SQLite and managed from the dashboard — never in `.env`.
- `.env` must never be committed (`.gitignore`).

## Issue Templates
- `.agents/templates/issue-template.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`