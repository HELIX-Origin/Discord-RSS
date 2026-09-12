# 🧪 Development & Testing Guide

This guide covers local development workflows, debugging techniques, TypeScript compilation checks, and automated test runners for Discord-RSS.

---

## 🛠️ Local Development Environment

### 1. Requirements
- **Node.js**: >= 20.0.0 (LTS recommended)
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
| `npm test` | Runs the test suite using Vitest / Jest. |

---

## 🧪 Testing Strategies

### 1. Feed Parser & Scraper Unit Tests
Unit tests validate parsing against mock RSS feeds, Atom XML payloads, malformed feeds, and social media scraper responses:
```bash
npm test -- src/feed/parser.test.ts
npm test -- src/feed/freegames.test.ts
```

### 2. Deduplication Engine Tests
Verifies that GUID matching, canonical link stripping, and content hashing prevent duplicate notifications across multiple poll cycles:
```bash
npm test -- src/feed/deduplication.test.ts
```

### 3. Embed Builder Tests
Validates character limit truncation, author icon resolution, platform color matching, and role mention strings:
```bash
npm test -- src/bot/embeds.test.ts
```

---

## 🔍 Debugging & Log Streaming

### Log Levels
Set `LOG_LEVEL=debug` in your `.env` to output detailed payload dumps, HTTP headers, ETag matches, and Discord REST response statuses to stdout.

### Web Dashboard Diagnostics
The web dashboard provides a live log viewer at `/settings` streaming real-time events, errors, and background watcher cycles directly from the Express server.
