# Git Commit & PR Message Guide

Guidelines for clear, human-readable commit messages and PR titles with fitting GitHub emojis. Consistent with the HELIX comment/issue conventions this repo already follows.

---

## Format Specification

```
<emoji> <type>(<scope>): <subject>

[optional body explaining rationale, architectural changes, or sub-task outcomes]

[optional issue / bug tracking references: Resolves #<issue>, Closes #<issue>]
```

## Standard Emoji & Commit Type Matrix

| Emoji | Type | Purpose | Example |
|---|---|---|---|
| ✨ | feat | New features or capabilities | ✨ feat(feed): add preset feed enablement |
| 🐛 | fix | Bug fixes and patches | 🐛 fix(state): hydrate sent entries on startup |
| 📝 | docs | Documentation and plan updates | 📝 docs(agents): sync roadmap-first tracking rules |
| 🧪 | test | Adding, updating, or fixing tests | 🧪 test(webhook): add retry/backoff suite |
| ♻️ | refactor | Code refactoring without behavioral change | ♻️ refactor(db): writer-through repository over AppState |
| ⚡ | perf | Performance optimizations | ⚡ perf(redis): batch sent-entry checks |
| 🔧 | chore | Tooling, config, and maintenance | 🔧 chore(deps): add redis@^5 |
| 🔒 | security | Security enhancements or fixes | 🔒 security(auth): rotate session tokens on logout |
| 🏗️ | build | Build system, tooling, packaging | 🏗️ build(config): add --env-file-if-exists start script |
| 🚀 | deploy | Deployment configuration | 🚀 deploy(oauth): public base URL redirect builder |

## Scopes

Targeted at the exact subsystem (Rule 02 layout):

`feed`, `status`, `webhook`, `state`, `redis`, `db`, `repo`, `auth`, `oauth`, `http`, `dashboard`, `router`, `server`, `scheduler`, `config`, `agents`, `docs`, `deps`

## Best Practices

1. **Imperative & Human-Readable**: Present tense, active voice (`✨ feat(feed): implement preset enablement`, not `implemented`).
2. **Specific Scopes**: Always target the exact subsystem.
3. **Reference GitHub Issues**: Append resolved issue or bug numbers (`Resolves #7`, `Closes #6`).
4. **Roadmap-First (Rule 04)**: Commits tied to a roadmap item reference the parent (#N) and sub-issue (#N). A commit may not advance until the referenced roadmap item exists.
5. **Clean History**: One logical change per commit; no secrets, `.env`, lock files, or local `data/` artifacts (Rule 00).

## PR Naming

- Subject mirrors the primary commit: `<emoji> <type>(<scope>): <subject>` (e.g., `✨ feat(feed): preset feed enablement`).
- Body is the change summary, tied back to the roadmap: `Part of #<parent>` / `Closes #<sub-issue>`.
- No new PR posts for roadmap progress; the issue's first post is the tracking home.