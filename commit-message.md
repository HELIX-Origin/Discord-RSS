feat: [workflows/docs/agents] CI code scan workflow replaces scheduled workflows; TypeScript/module references

- Removed `.github/workflows/post-feed-to-discord.yml` and `.github/workflows/site-status-alert.yml`.
- Created `.github/workflows/ci.yml`: TypeScript build (`npm run build`), vitest (`npm test`), secret naming scan (`{SERVICE_NAME}_WEBHOOK_URL_{###}`, `{SOURCE}_RSS_URL_{###}`), agent rules verification, Discohook reference.
- Updated agent docs, README, docs to reference CI workflow (`ci.yml`) and TypeScript module architecture.
- No `.env`; no Python references in workflows; underscore naming maintained.
