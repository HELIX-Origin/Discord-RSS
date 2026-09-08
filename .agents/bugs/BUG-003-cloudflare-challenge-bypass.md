# Bug Report: [BUG-003] Cloudflare Challenge Bypass Fails When Playwright Not Installed

## Metadata
- **Bug ID**: BUG-003
- **Status**: Open
- **Priority**: High
- **Component**: Python Scripts / External API
- **Reported Date**: 2026-09-07
- **Target Resolution**: Phase 3
- **GitHub Issue**: [#3](https://github.com/HELIX-Origin/Site-Feed-Discord/issues/3)

---

## Sub-Issues & Milestone Breakdown

```mermaid
flowchart TD
    Parent["Parent Bug: BUG-003"] --> Sub1["Sub-Issue 1: Root Cause & Diagnostics"]
    Parent --> Sub2["Sub-Issue 2: Core Fix & Implementation"]
    Parent --> Sub3["Sub-Issue 3: Test Suite & Regression Checks"]
    Parent --> Sub4["Sub-Issue 4: Verification & Docs"]
```

- [ ] **Sub-Issue 1: Root Cause & Diagnostics** (`#9`)
- [ ] **Sub-Issue 2: Core Fix & Implementation** (`#10`)
- [ ] **Sub-Issue 3: Test Suite & Regression Checks** (`#11`)
- [ ] **Sub-Issue 4: Verification & Docs** (`#12`)

---

## Description
When the target `SITE_URL` is behind a Cloudflare challenge (`cf-challenge`, `managed challenge`), `fetch_via_browser()` attempts to import `playwright.sync_api`. If `playwright` is not installed or the runtime lacks a browser binary, the script raises an unhandled `SystemExit` instead of attempting an external challenge-solving API or providing a graceful fallback.

## Reproduction & Error Flow

```mermaid
flowchart LR
    Start["Fetch Feed / Site URL"] --> Check{"Cloudflare Challenge Detected?"}
    Check -->|"Yes"| Import{"Playwright Available?"}
    Import -->|"No"| Error["SystemExit: Playwright missing"]
    Import -->|"Yes"| Browser["Browser Automation"]
```

## Steps to Reproduce
1. Set `SITE_URL` to a domain protected by Cloudflare (`cf-turnstile`).
2. Run `python scripts/post_feed_to_discord.py` without `playwright` installed.
3. Observe `SystemExit: The target site is behind a Cloudflare browser challenge...`

## Expected Behavior
If `playwright` is unavailable, the agent should check for an optional external challenge-solving API configured via **GitHub Secrets** (`CLOUDFLARE_API_KEY` or `CHALLENGE_SOLVER_URL`), attempt to solve via that service, and fall back to `urllib.request` with a clear warning message. If no external service is configured, the script should exit cleanly with a message instructing the user to either install `playwright` or configure an external API.

## Actual Behavior
Script exits with an unhandled exception, providing no path for users who prefer external APIs over browser automation.

## Environment Details
- **OS**: Linux / macOS / Windows
- **Python Version**: v3.11 / v3.12
- **Playwright Installed**: No
- **Site-Feed-Discord Version**: 1.0.0

## Root Cause Analysis
`fetch_via_browser()` assumes `playwright` is the only resolution mechanism. There is no branch for external APIs or graceful degradation when the dependency is missing.

## Resolution Architecture

```mermaid
sequenceDiagram
    participant User as User / Workflow
    participant Handler as Python Script
    participant Fix as External API / Playwright
    User->>Handler: Fetch protected site
    Handler->>Fix: Detect challenge markers
    Fix->>Handler: Check secrets (CLOUDFLARE_API_KEY)
    alt External API Configured
        Fix->>Handler: Call external solver
    else Playwright Installed
        Fix->>Handler: Launch headless browser
    else Nothing Configured
        Fix->>Handler: Return graceful exit with instructions
    end
    Handler-->>User: Feed content or clear message
```

## Resolution & Fix
- Add optional `CLOUDFLARE_API_KEY` and `CHALLENGE_SOLVER_URL` environment variables.
- Modify `fetch_via_browser()` to try external API first (if configured), then `playwright`, then graceful exit.
- Update `.agents/skills/cloudflare.md` with external API configuration examples.
- Update `.agents/rules/01-zero-unsolicited-injection.md` to document permitted external APIs.
