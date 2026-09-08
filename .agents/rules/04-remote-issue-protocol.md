# Rule 04: Remote Issue & Comment Protocol

## Mandatory Protocol
1. **GitHub Issue Mirror**: All tracked bugs must have a mirrored GitHub Issue (`HELIX-Origin/Site-Feed-Discord/issues`) with a standard title format: `[BUG-XXX] Short description`.
2. **Body File Submissions**: When creating or updating remote issues, always write the body/comment to a UTF-8 markdown file first, then submit via `--body-file <file.md>`. Never supply unescaped inline markdown or Unicode directly in PowerShell or bash arguments.
3. **Mermaid Diagrams Required**: Every bug report must include at least one Mermaid `flowchart` or `sequenceDiagram` visualizing the error trigger or fix architecture.
4. **Sub-Issue Decomposition**: Complex bugs must be decomposed into 4 sub-issues:
   - Sub-Issue 1: Root Cause & Diagnostics
   - Sub-Issue 2: Core Fix & Implementation
   - Sub-Issue 3: Test Suite & Regression Checks
   - Sub-Issue 4: Verification & Docs Sync
