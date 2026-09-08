# Bug Tracking Index

This directory contains tracked bugs and issues for Site-Feed-Discord. Every bug has its own tracking file following the standard sub-issue template and is mirrored directly to GitHub Issues.

---

## Bug Lifecycle & Sub-Issue Flow

```mermaid
flowchart TD
    subgraph Triage ["1. Discovery & Triage"]
        O[Open Issue] --> Tri[Sub-Issue 1: Root Cause & Diagnostics]
    end

    subgraph Fix ["2. Remediation"]
        Tri --> Imp[Sub-Issue 2: Core Fix & Refactor]
    end

    subgraph Verification ["3. Validation"]
        Imp --> Tst[Sub-Issue 3: Test Suite & Regression Checks]
        Tst --> Ver[Sub-Issue 4: Verification & Docs Sync]
    end

    subgraph Closure ["4. Resolution"]
        Ver --> Res[Resolved & Closed]
    end
```

---

## Tracked Bugs

| Bug ID | Title | Priority | Status | Sub-Issues | GitHub Issue | File |
|--------|-------|----------|--------|------------|--------------|------|
| **BUG-001** | State file JSON corruption on concurrent workflow runs | High | Open | 4 Sub-Tasks | [#1](https://github.com/HELIX-Origin/Site-Feed-Discord/issues/1) | [BUG-001-state-file-corruption.md](BUG-001-state-file-corruption.md) |
| **BUG-003** | Cloudflare Challenge Bypass Fails When Playwright Not Installed | High | Open | 4 Sub-Tasks | [#3](https://github.com/HELIX-Origin/Site-Feed-Discord/issues/3) | [BUG-003-cloudflare-challenge-bypass.md](BUG-003-cloudflare-challenge-bypass.md) |
| **BUG-002** | Feed parser fails on non-UTF-8 RSS content | Medium | Investigating | 4 Sub-Tasks | [#2](https://github.com/HELIX-Origin/Site-Feed-Discord/issues/2) | [BUG-002-non-utf8-rss.md](BUG-002-non-utf8-rss.md) |
| **BUG-003** | Status webhook fires false positive during brief network blips | Medium | Open | 4 Sub-Tasks | [#3](https://github.com/HELIX-Origin/Site-Feed-Discord/issues/3) | [BUG-003-false-positive-status.md](BUG-003-false-positive-status.md) |

---

## Reporting & Sub-Issue Tracking Protocol

All bugs are tracked directly via **GitHub Issues** on the repository (`HELIX-Origin/Site-Feed-Discord`):

1. **Create Parent GitHub Issue**:
   ```bash
   gh issue create --title "[BUG-XXX] Short description" --body-file ".agents/bugs/template.md" --label "bug"
   ```
2. **Decompose into Sub-Issues**:
   For complex issues, decompose the lifecycle into sub-issues:
   - `Sub-Issue 1: Root Cause & Diagnostics`
   - `Sub-Issue 2: Core Fix & Implementation`
   - `Sub-Issue 3: Test Suite & Regression Checks`
   - `Sub-Issue 4: Verification & Docs Sync`
3. **Embed Mermaid Diagrams**:
   Include Mermaid sequence or flow diagrams in the issue description to visualize error triggers and target remediation flow.
4. **Create Local Tracking Mirror**:
   - Copy [template.md](template.md) to `BUG-XXX-<slug>.md`.
   - Update the tracked bug table above.
5. **Multi-Agent Sync**:
   - Synchronize across `.agents/` and `.github/` documentation.
