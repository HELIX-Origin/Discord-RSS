> [!IMPORTANT]
> **LEGACY** — This phase describes the superseded Site-Feed-Discord Python/Discohook plan. See [roadmap.md](roadmap.md) and the live tracking at GitHub Issue #4.
> 
# Phase 1 — Agent Ecosystem & Safety Rules

## Goals
Establish the agent ecosystems (`.agents/`, `.opencode/`, `.gemini/`, `.copilot/`) with mandatory rules, bug tracking, and index files.

## Sub-Issues
- [x] Create `.agents/` directory structure
- [x] Write `rules/agent-safety-compliance.md`
- [x] Write `rules/zero-unsolicited-injection.md`
- [x] Write `rules/typescript-architecture.md`
- [x] Write `rules/message-formatting.md`
- [x] Write `rules/remote-issue-protocol.md`
- [x] Write `rules/documentation-standards.md`
- [x] Create `bugs/template.md` and `bugs/bug-tracking.md`
- [x] Create `bugs/BUG-001-state-file-corruption.md`
- [x] Create `bugs/BUG-002-non-utf8-rss.md`
- [x] Create `.opencode/opencode.json` and `.opencode/agent/*.md` agent files
- [x] Create `.gemini/gemini.md` and `.copilot/copilot.md` configurations

## Verification
- [x] All `.agents/rules/*.md` files exist and reference the correct rule filenames
- [x] `.agents/bugs/bug-tracking.md` links to GitHub Issues
- [x] `opencode.json` passes schema validation (only supported top-level keys)