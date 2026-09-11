# Rule 05: Documentation Standards & Root Landing

## Mandatory Standards
1. **Documentation Landing**: Documentation is hosted entirely via the `wiki/` directory. `wiki/HOME.md` and `wiki/_Sidebar.md` serve as the central index and entry points. Every documentation page must be linked from them. No separate `docs/` folder exists.
2. **Markdown Conventions**: All `.md` files must use `#` for titles, `---` for separators, and bullet lists with consistent indentation. No broken internal links.
3. **Agent Documentation Sync**: Any change to `.agents/` (rules, bugs, plans, skills, templates, agents) must be reflected in the corresponding index file update (`.agents/rules/index.md`, `.agents/agents/index.md`, `.agents/skills/index.md`, `AGENTS.md`).
4. **No Uncommitted Secret Documentation**: Documentation must reference `.env.example` for the `DISCORD_RSS_*` runtime settings. Feeds and OAuth credentials are **SQLite records managed from the dashboard — never documented as env vars**. Never include real webhook URLs, tokens, or site URLs in docs unless they are public demonstration URLs. The `.env` file must never be committed (Rule 00).
5. **Standards Documentation**: Issue/PR/commit naming and message standards are defined in `.agents/rules/remote-issue-protocol.md` (Issue/PR/commit formats) and `.agents/templates/commit-message-guide.md` (emoji type/scope matrix).