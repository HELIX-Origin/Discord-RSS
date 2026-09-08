# Bug Report: [BUG-001] State File JSON Corruption on Concurrent Workflow Runs

## Metadata
- **Bug ID**: BUG-001
- **Status**: Open
- **Priority**: High
- **Component**: GitHub Actions / Python Scripts
- **Reported Date**: 2026-09-07
- **Target Resolution**: Phase 1
- **GitHub Issue**: [#1](https://github.com/HELIX-Origin/Site-Feed-Discord/issues/1)

---

## Sub-Issues & Milestone Breakdown

```mermaid
flowchart TD
    Parent["Parent Bug: BUG-001"] --> Sub1["Sub-Issue 1: Root Cause & Diagnostics"]
    Parent --> Sub2["Sub-Issue 2: Core Fix & Implementation"]
    Parent --> Sub3["Sub-Issue 3: Test Suite & Regression Checks"]
    Parent --> Sub4["Sub-Issue 4: Verification & Docs"]
```

- [ ] **Sub-Issue 1: Root Cause & Diagnostics** (`#1`)
- [ ] **Sub-Issue 2: Core Fix & Implementation** (`#2`)
- [ ] **Sub-Issue 3: Test Suite & Regression Checks** (`#3`)
- [ ] **Sub-Issue 4: Verification & Docs** (`#4`)

---

## Description
When two scheduled workflow runs overlap (e.g., a delayed previous run plus a new scheduled run), the `.github/feed-state.json` file can be overwritten with partial or stale data, causing duplicate posts or lost entries.

## Reproduction & Error Flow

```mermaid
flowchart LR
    Start["Scheduled Workflow Trigger"] --> Check{"Concurrent Run?"}
    Check -->|"Yes"| Error["State File Overwritten"]
    Check -->|"No"| Success["Normal Execution"]
```

## Steps to Reproduce
1. Trigger two `.github/workflows/post-feed-to-discord.yml` runs manually within 30 seconds.
2. Observe `.github/feed-state.json` modification times.

## Expected Behavior
Only one concurrent run should modify state; overlapping runs must be blocked by `concurrency:` or atomic file writes.

## Actual Behavior
Overlapping runs corrupt `.github/feed-state.json`. Webhook references (`DISCORD WEBHOOK URL 001`, etc.) are not affected by state file corruption, but duplicate posts may be sent to the same webhook endpoint.

## Environment Details
- **OS**: Linux (GitHub Actions `ubuntu-latest`)
- **Python Version**: v3.11
- **Site-Feed-Discord Version**: 1.0.0

## Root Cause Analysis
The Python script reads and writes state files without file-level locking, and the workflow `concurrency:` group may not cover manual triggers.

## Resolution Architecture

```mermaid
sequenceDiagram
    participant User as Workflow Trigger
    participant Handler as Python Script
    participant Fix as Atomic State Write
    User->>Handler: Trigger feed check
    Handler->>Fix: Lock & validate JSON
    Fix-->>Handler: Confirm safe write
    Handler-->>User: Output result
```

## Resolution & Fix
Add `os.rename()` atomic write pattern and enforce `concurrency:` on manual dispatch.
