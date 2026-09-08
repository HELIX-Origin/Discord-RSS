# Rule 00: Agent Safety, Instruction Compliance & Damage Prevention

## Purpose
This is the foundational safety rule for all AI agents working on Site-Feed-Discord. It guarantees that no irreversible damage is done to code, data, assets, or Git history, and ensures that agents strictly obey user instructions without deviation or regression.

---

## 1. Zero Irreversible Damage (Safety Invariants)

1. **No Destructive File Deletions**:
   - Never perform bulk, unverified, or recursive force-deletions (`rm -rf`, `Remove-Item -Recurse -Force`) on `.github/workflows/`, `scripts/`, `tests/`, or `docs/` without explicit user authorization.
   - State files (`.github/feed-state.json`, `.github/site-status-state.json`) must never be deleted without user confirmation.

2. **State File Protection**:
   - Never corrupt, truncate, or manually rewrite `.github/feed-state.json` or `.github/site-status-state.json` with invalid JSON.
   - Any update to state files must go through the Python scripts (`post_feed_to_discord.py`, `post_site_status.py`) with proper validation.

3. **Git & Repository Safety**:
   - **NEVER** force-push (`git push --force`, `git push -f`) to `main` or any shared upstream branch.
   - Never reset or destroy uncommitted user work without explicit confirmation. Always check `git status` before performing git operations.

4. **Cloudflare & External Service Protection**:
   - External APIs and browser automation (`playwright`, `certifi`, challenge-solving services) are permitted **only** for Cloudflare-protected domains.
   - Any external service API key must be stored exclusively in **GitHub Secrets**; never commit `.env` files or source files containing them.
   - Agents must never log challenge tokens, cookies, session data, or browser fingerprints.

5. **Secrets & Credentials Protection**:
   - Never hardcode, commit, or log sensitive environment variables (`DISCORD_WEBHOOK_URL`, `DISCORD_STATUS_WEBHOOK_URL`, `SITE_URL`).
   - All secrets must remain in repository secrets or `.env` templates that are `.gitignore`d.

5. **Binary & Workflow File Preservation**:
   - Never alter `.github/workflows/*.yml` files as UTF-8 text in a way that corrupts YAML indentation or removes required keys (`name:`, `on:`, `jobs:`).

---

## 2. Strict Instruction Following & Anti-Regression

1. **Unconditional Obedience to Explicit User Directives**:
   - When the user directs an architectural change (e.g., "drop Python scripts entirely", "switch to TypeScript workflows", "use vanilla Python stdlib only"), the agent MUST follow it across 100% of the codebase.
   - Never reintroduce deleted, deprecated, or forbidden patterns that the user explicitly ordered to remove.

2. **No Unsolicited Framework Injection**:
   - Do not install unauthorized external libraries (e.g., `discord.py`, `requests` if `urllib` is sufficient, heavy framework packages) when the user specifies native standard libraries or existing dependencies.

3. **Single Source of Truth for Messages**:
   - All Discord webhook messages, embed formatting, and status alerts must be routed through `scripts/post_feed_to_discord.py` and `scripts/post_site_status.py`. Do not embed raw webhook URLs or message payloads elsewhere.

4. **Verification Requirement Before Task Completion**:
   - No task is complete until verified. The agent must run:
     ```bash
     python -m unittest discover -s tests -p "test_*.py"
     ```
   - If any test fails or syntax error is introduced, it must be resolved immediately before handing control back to the user.
