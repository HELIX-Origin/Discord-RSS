# Rule 00: Agent Safety, Instruction Compliance & Damage Prevention

## Purpose
This is the foundational safety rule for all AI agents working on Discord RSS (rebuild of Site-Feed-Discord). It guarantees that no irreversible damage is done to code, data, assets, or Git history, and ensures that agents strictly obey user instructions without deviation or regression.

---

## 1. Zero Irreversible Damage (Safety Invariants)

1. **No Destructive File Deletions**:
   - Never perform bulk, unverified, or recursive force-deletions (`rm -rf`, `Remove-Item -Recurse -Force`) on `src/`, `tests/`, `docs/`, `.github/`, or user-authored data without explicit user authorization.
   - Deleting a stale/obsolete tracked file (e.g., `src/webhook/discohook.ts`) requires it to be verified as no longer referenced (grep) before removal.

2. **Data Protection**:
   - Never corrupt, truncate, or rewrite the SQLite database (`data/discord-rss.db`) or its backups directly. All writes go through `src/db/repository.ts` (write-through over AppState).
   - Indices/state live in-memory (`AppState`); never persist duplicated mutable state files.

3. **Git & Repository Safety**:
   - **NEVER** force-push (`git push --force`, `git push -f`) to `main` or any shared upstream branch.
   - Never reset or destroy uncommitted user work without explicit confirmation. Always check `git status` before performing git operations.
   - Before committing, inspect `git status`, `git diff`, and `git log --oneline`. Stage only intended files; never commit secrets.

4. **Cloudflare & External Service Protection**:
   - External APIs and browser automation (`playwright`, challenge-solving services) are permitted **only** for Cloudflare-protected domains.
   - `CLOUDFLARE_API_KEY` / `CHALLENGE_SOLVER_URL` must be stored exclusively in `.env` or secrets (which must never be committed).
   - Agents must never log challenge tokens, cookies, session data, or browser fingerprints.

5. **Secrets & Credentials Protection**:
   - Never hardcode, commit, or log sensitive secrets (`DISCORD_RSS_*` env values, `CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`, Discord webhook tokens, OAuth client secrets, session tokens).
   - Webhook/feed/monitor configuration is user data in SQLite — treating it as "secrets" means never leaking URLs with credentials into logs or commits.
   - All secrets must remain in `.env` (`.gitignore`d) or the SQLite DB; `.env.example` is a template only.

6. **Configuration File Preservation**:
   - Never alter configuration files (`tsconfig.json`, `package.json`, `.github/*.yml`) in a way that corrupts their structure or removes required keys.

---

## 2. Strict Instruction Following & Anti-Regression

1. **Unconditional Obedience to Explicit User Directives**:
   - When the user directs an architectural change (e.g., "no Discohook", "AppState over DB reads", "use vanilla TypeScript"), the agent MUST follow it across 100% of the codebase.
   - Never reintroduce deleted, deprecated, or forbidden patterns that the user explicitly ordered to remove (e.g., Discohook webhook delivery, env-var webhook naming).

2. **No Unsolicited Framework Injection**:
   - Do not install unauthorized external libraries when the user specifies native TypeScript/Node or existing dependencies. `redis@^5` is pre-approved; `playwright` is permitted only for Cloudflare; anything else requires explicit user approval.

3. **Single Source of Truth for Messages**:
   - All Discord webhook messages, embed formatting, and status alerts are built in `src/webhook/discord.ts` and delivered via `sendWebhook`. Do not embed raw webhook URLs or message payloads elsewhere.

4. **Verification Requirement Before Task Completion**:
   - No task is complete until verified. The agent must run:
     ```bash
     npm run build
     npx tsc --noEmit
     ```
   - If the project has tests: `npm test`. If any check fails or a type/syntax error is introduced, resolve it immediately before handing control back to the user.

5. **Agent Standards Sync (Rule 04/05)**:
   - Issue/PR/comment/commit naming follows `.agents/rules/remote-issue-protocol.md` and `.agents/templates/commit-message-guide.md`.
   - Documentation changes must be reflected in the `.agents/` indexes (Rule 05).