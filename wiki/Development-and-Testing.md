# 🧪 Development & Testing Guide

This guide covers local development workflows, debugging techniques, TypeScript compilation checks, and verification commands for HELIX RSS.

---

## 🛠️ Local Development Environment

### 1. Requirements
- **Node.js**: >= 22.9.0 (LTS recommended; native `node:sqlite` required)
- **npm**: >= 10.0.0
- **TypeScript**: 5.x

### 2. Available NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts application with hot-reloading via `tsx` / nodemon. |
| `npm run build` | Compiles TypeScript source files into the `dist/` directory. |
| `npm start` | Executes the production bundle from `dist/dashboard/server.js`. |
| `npm run check` | Executes `tsc --noEmit` to validate all TypeScript types and exports. |
| `npm run lint` | Runs ESLint across the codebase for static code analysis. |
| `npm run format` | Runs Prettier to automatically format code according to standards. |
| `npm test` | No in-repo test suite. Integration tests are maintained in a dedicated Vitest repository. |

---

## 🧪 Testing Strategies

The main HELIX RSS repository does not contain an in-repo test suite. Integration and regression tests are maintained in a separate dedicated Vitest repository.

When contributing core logic changes, validate them with:

```bash
npm run check   # typecheck + format check + lint
npm run build   # compile the production bundle
```

For local manual verification, set `LOG_LEVEL=debug` in `.env` and inspect the Service Logs in the dashboard.

---

## 🔍 Debugging & Log Streaming

### Log Levels
Set `LOG_LEVEL=debug` in your `.env` to output detailed payload dumps, HTTP headers, ETag matches, and Discord REST response statuses to stdout.

### Web Dashboard Diagnostics
For Discord bot owners/team members, the **Developer Tools** tab in the dashboard provides a **Service Logs** page (full activity log with level filtering) plus runtime diagnostics, live uptime, and memory usage.
