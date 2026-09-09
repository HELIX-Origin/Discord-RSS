# Rule 04: Remote Issue, PR & Comment Protocol

## Core Principle: Roadmap-First Tracking

**The first post of an issue (or PR) is ALWAYS the complete roadmap** for that plan. Progress is recorded by **editing that post — never by adding new posts** for items already listed in it.

1. **First Post = Roadmap**: When an issue is opened, its body is a full roadmap: goal, phases/milestones, sub-issues, acceptance criteria, and any related diagrams. This is the tracking home for the entire plan.
2. **Edit, Don't Post**: As work progresses, existing roadmap items are updated (checked off, annotated) **in the first post**. No new top-level comments are created for things already listed there. New posts are reserved for smaller discoveries that branch off the roadmap — never for project plans themselves.
3. **New Discoveries**: When a new item is uncovered that is not on the roadmap:
   - First **update the first post** to add it to the plan.
   - Then add **one small new comment** simply explaining what was added and why.
4. **Sub-Issue Decomposition**: Complex work is decomposed into sub-issues linked from the parent (task lists). Each sub-issue may itself be decomposed further into **smaller sub-issues / steps** so every distinct step is tracked separately and work stays in small, easy-to-manage units. Rebuild-type work uses the 4-issue lifecycle:
   - Sub-Issue 1: Diagnostics / Architecture
   - Sub-Issue 2: Core Implementation
   - Sub-Issue 3: Test Suite & Regression Checks
   - Sub-Issue 4: Verification & Docs Sync
5. **PRs Mirror Issues**: Pull requests reference their parent and sub-issues (`Part of #N`, `Closes #N`). PR body is a change summary tied back to the issue roadmap.
6. **One Roadmap Per Plan**: Every new plan gets its **own `[PLAN]` issue** whose first post is that plan's roadmap. A plan issue is the roadmap for **that plan's sub-issues only** — it is **not** a global repository roadmap. Starting a new plan means opening a new `[PLAN]` issue; never fold a separate plan into an existing roadmap issue (other than as its sub-issues), and never treat a single issue as a repo-wide tracker.

## Naming Standards

### Issues
| Kind | Title Prefix | Example |
|------|--------------|---------|
| Rebuild / roadmap plan | `[PLAN] ` | `[PLAN] Multi-user Discord RSS rebuild` |
| Bug report | `[BUG-XXX] ` | `[BUG-002] Feed parser fails on non-UTF-8 RSS` |
| Feature request | `feat: ` | `feat: support scheduled status monitors` |
| Sub-issue | `Sub-Issue N: ` with parent reference | `Sub-Issue 2: Core Implementation (#4)` |
| Discovery / side-change | plain description; linked to parent in body | `fix: dashboard drop-down refresh on preset enable` |

### Pull Requests
- Subject mirrors the primary commit: `<emoji> <type>(<scope>): <subject>` (see `commit-message-guide.md`).
- Body references the roadmap: `Part of #<parent>` / `Closes #<sub-issue>`.

### Commits
- Format: `<emoji> <type>(<scope>): <subject>` per `.agents/templates/commit-message-guide.md`.
- Reference `BUG-XXX` or GitHub issue/sub-issue `#N` when applicable.

## Mandatory Protocol

1. **Body File Submissions**: When creating or updating remote issues/PRs (body or comments), always write the content to a UTF-8 markdown file first, then submit via `--body-file <file.md>`. Never pass unescaped inline markdown or Unicode directly in PowerShell/bash arguments.
2. **Mermaid Diagrams Required**: Every plan/bug report must include at least one Mermaid `flowchart` or `sequenceDiagram` visualizing architecture or error flow.
3. **Roadmap Updates Via Edit**: Updating the roadmap means `gh issue edit <parent> --body-file <roadmap.md>` (or `gh pr edit`). Small explanatory new comments are allowed **only** for newly discovered additions.
4. **Commit Message Standards**: Follow `.agents/templates/commit-message-guide.md`: emoji type, scoped subject, and `Resolves/Closes #N` reference.
5. **HELIX Compatibility**: Sub-issue decomposition, comment templates, and emoji commit matrix follow HELIX conventions; the roadmap-first refinement above takes precedence for this repo's tracking.