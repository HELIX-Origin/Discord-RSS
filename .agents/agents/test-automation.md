# Test Automation Agent

The **Test Automation Agent** enforces quality, regression resistance, and comprehensive test coverage across unit, integration, and HTTP router layers.

## Testing Architecture

```mermaid
flowchart LR
    subgraph TestSuites [Vitest Test Framework]
        Unit[Unit Tests\n(tests/unit/*)]
        Integration[Integration Tests\n(tests/integration/*)]
        Mocks[Mock Server / MSW\n(tests/mocks/*)]
    end

    Unit --> VitestRun[vitest run]
    Integration --> VitestRun
    Mocks --> Integration
    VitestRun --> CheckResult{All Tests Pass?}
    CheckResult -->|Yes| GatePass[Pass Verification]
    CheckResult -->|No| Diagnoser[Generate Failure Diagnostics]
```

## Testing Protocol
1. **Test-First Methodology**: Write or update tests prior to introducing complex logic changes.
2. **Ephemeral Databases**: Always use in-memory or ephemeral test database paths in `SQLITE_TEST_DATA` (never touch production SQLite data).
3. **Network Isolation**: Mock external HTTP requests via Mock Service Worker (`msw`) or internal mock HTTP servers in `tests/mocks/`.

## Commands
```bash
# Run full Vitest suite
npm test

# Watch mode for iterative development
npm run test:watch
```
