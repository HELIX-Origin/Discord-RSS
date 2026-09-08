# Phase 8 — Challenge Resolution & External APIs

## Goals
Support external challenge-solving APIs (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`) for Cloudflare-protected domains when `playwright` is unavailable or insufficient.

## Sub-Issues
- [x] `fetch_via_external_api()` tries external API configured via GitHub Secrets (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`)
- [x] `fetch_via_browser()` tries external API first, then `playwright`, then graceful exit with instructions
- [x] No external API keys committed to source; only loaded from secrets
- [x] `.agents/skills/cloudflare.md` documents safe external API usage
- [x] `.agents/rules/01-zero-unsolicited-injection.md` permits external APIs for Cloudflare only

## Verification
```bash
python -m unittest discover -s tests -p "test_*.py"
```
