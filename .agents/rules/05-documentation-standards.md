# Rule 05: Documentation Standards & Root Landing

## Mandatory Standards
1. **Root Documentation Landing**: `docs/README.md` must exist and serve as the index for all documentation. Every doc page must be linked from it.
2. **Markdown Conventions**: All `.md` files must use `#` for titles, `---` for separators, and bullet lists with consistent indentation. No broken internal links.
3. **Agent Documentation Sync**: Any change to `.agents/` (rules, bugs, plans, skills) must be reflected in a corresponding docs reference or `.agents/` index file update.
4. **No Uncommitted Secret Documentation**: Documentation must reference **GitHub Secrets** using the `{SERVICE_NAME} WEBHOOK URL {###}` naming convention (e.g., `DISCORD WEBHOOK URL 001`). Never include real webhook URLs, tokens, or site URLs in docs unless they are public demonstration URLs.
