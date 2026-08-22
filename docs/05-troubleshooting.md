# Troubleshooting

This page covers the most common issues encountered when running or supporting the repository.

## Feed posts are not showing up

Check the following in order:

1. Confirm `DISCORD_WEBHOOK_URL` is set as a repository secret.
2. Confirm the workflow ran successfully in GitHub Actions.
3. Verify the feed was discovered or the `FEED_URL` override is correct.
4. Ensure the discovered links are still under an allowed host.
5. Check whether the site is returning a Cloudflare challenge page or a blocked response.

## Site status alerts are frequent or wrong

The site-status job is intentionally strict. It treats Cloudflare challenge pages as an unavailable site state, because the site is not reliably accessible in that case.

If the host wants smoother site-status monitoring, the best fix is to expose a clean, standard-access public endpoint or to reduce anti-bot interference on the site itself.

## Cloudflare challenge problems

This repository is built to handle the common Cloudflare challenge pattern, but a strict challenge page can still prevent reliable automation. The recommended mitigation is to pair the automation with a public, clean feed endpoint and minimize challenge behavior for the public board pages.

## The workflow commits state changes but does not post new items

This usually means:

- the state file already reflects the latest item
- the site returned no visible entries after filtering
- the parser only found non-public or excluded entries

Review the state and the `ALLOWED_HOSTS` / `EXCLUDED_URL_SUBSTRINGS` settings if the site layout has changed.

## State files are not updating

The repository commits user-facing state files back to GitHub after workflow runs. If the workflow is not able to commit, confirm the repository has the necessary permissions and that the workflow is not blocked by branch protections or a detached branch condition.

## Site host support is optional, but recommended

A site host can improve reliability by exposing a stable RSS/Atom endpoint, reducing challenge friction, and making the public feed easier to parse. This is optional, but it is the best way to make the automation smoother and more consistent over time.
