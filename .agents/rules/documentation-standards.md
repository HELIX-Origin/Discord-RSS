# Rule 05: Documentation Standards & Root Landing

## Mandatory Standards
1. **Root Documentation Landing**: `docs/README.md` must exist (when a `docs/` directory is present) and serve as the index for all documentation. Every doc page must be linked from it.
2. **Markdown Conventions**: All `.md` files must use `#` for titles, `---` for separators, and bullet lists with consistent indentation. No broken internal links.
3. **Agent Documentation Sync**: Any change to `.agents/` (rules, bugs, plans, skills, templates, agents) must be reflected in the corresponding index file update (`.agents/rules/index.md`, `.agents/agents/index.md`, `.agents/skills/index.md`, `AGENTS.md`).
4. **No Uncommitted Secret Documentation**: Documentation must reference `.env.example` for the `DISCORD_RSS_*` runtime settings. Webhooks, feeds, monitors, and OAuth credentials are **SQLite records managed from the dashboard — never documented as env vars**. Never include real webhook URLs, tokens, or site URLs in docs unless they are public demonstration URLs. The `.env` file must never be committed (Rule 00).
5. **Standards Documentation**: Issue/PR/commit naming and message standards are defined in `.agents/rules/remote-issue-protocol.md` (Issue/PR/commit formats) and `.agents/templates/commit-message-guide.md` (emoji type/scope matrix).