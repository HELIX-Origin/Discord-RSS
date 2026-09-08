# Troubleshooting

This page covers the most common issues encountered when running or supporting the repository.

## Feed posts are not showing up

Check the following in order:

1. Confirm `DISCORD_WEBHOOK_URL_001` (and any additional `DISCORD_WEBHOOK_URL_{###}` secrets) are set as repository secrets.
2. Confirm the workflow `.github/workflows/post-feed-to-discord.yml` ran successfully in GitHub Actions.
3. Verify the feed was discovered or the `{SOURCE}_RSS_URL_{###}` override is correct.
4. Ensure the discovered links are still under an allowed host (`ALLOWED_HOSTS`).
5. Check whether the site is returning a Cloudflare challenge page or a blocked response.
6. If behind Cloudflare, verify `CLOUDFLARE_API_KEY` / `CHALLENGE_SOLVER_URL` secrets are configured or `playwright` is installed.

## Site status alerts are frequent or wrong

The site-status job is intentionally strict. It treats Cloudflare challenge pages as an unavailable site state, because the site is not reliably accessible in that case.

If the host wants smoother site-status monitoring, the best fix is to expose a clean, standard-access public endpoint or to reduce anti-bot interference on the site itself. For protected sites, configure external challenge-solving APIs (`CLOUDFLARE_API_KEY`, `CHALLENGE_SOLVER_URL`) or rely on `playwright`.

## Cloudflare challenge problems

This repository is built to handle the common Cloudflare challenge pattern. The script tries an external challenge-solving API first (if configured via GitHub Secrets), then falls back to `playwright` headless browser automation, then exits gracefully with instructions if neither is available.

If a strict challenge page still prevents reliable automation, the recommended mitigation is to pair the automation with a public, clean feed endpoint and minimize challenge behavior for the public board pages.

## The workflow commits state changes but does not post new items

This usually means:

- the state file (`.github/feed-state.json`, written atomically via `os.rename()`) already reflects the latest item
- the site returned no visible entries after filtering (`ALLOWED_HOSTS`, `EXCLUDED_URL_SUBSTRINGS`)
- the parser only found non-public or excluded entries
- the webhook URLs (`DISCORD_WEBHOOK_URL_{###}`) are missing or misconfigured in secrets

Review the state file and the filter settings if the site layout has changed.

## State files are not updating

The repository commits user-facing state files back to GitHub after workflow runs using atomic writes (`.tmp` + `os.rename()`). If the workflow is not able to commit, confirm the repository has the necessary permissions and that the workflow is not blocked by branch protections or a detached branch condition.

## Site host support is optional, but recommended

A site host can improve reliability by exposing a stable RSS/Atom endpoint, reducing challenge friction, and making the public feed easier to parse. This is optional, but it is the best way to make the automation smoother and more consistent over time.
