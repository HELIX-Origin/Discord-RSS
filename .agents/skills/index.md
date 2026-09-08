# Skills Index

This directory contains technical skill definitions for frameworks, languages, platforms, and workflows supported by Discord RSS (rebuild of Site-Feed-Discohook).

## Available Skills

### TypeScript & Node
- [typescript.md](typescript.md) — TypeScript ESM / Node `>=22.9`, native runtimes (`node:sqlite`, `fetch`), approved `redis@^5`, vitest.

### Web & Feed Technologies
- [rss-atom.md](rss-atom.md) — RSS 2.0, Atom feeds, native XML parsing, encoding fallbacks, scrape branch.
- [discord-webhooks.md](discord-webhooks.md) — Direct Discord webhooks; per-user SQLite rows (dashboard-managed, not env vars); embed construction; retry/backoff.

### Platform & CI/CD
- [code-hosting-platforms.md](code-hosting-platforms.md) — GitHub (`gh`), roadmap-first issue tracking (Rule 04).
- [web-basics.md](web-basics.md) — HTTP/HTTPS fundamentals, status codes, timeouts, URL normalization.

### External APIs & Challenge Resolution
- [cloudflare.md](cloudflare.md) — Cloudflare challenge detection, `playwright` browser automation (permitted), safe credential handling.

Notes:
- Discohook has been removed from the project (direct Discord posting only). See `discord-webhooks.md`.
- Env-secret naming (`{SERVICE_NAME}_WEBHOOK_URL_{###}`, `{SOURCE}_RSS_URL_{###}`) is obsolete; webhooks/feeds are dashboard-managed SQLite rows.