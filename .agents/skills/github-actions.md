# GitHub Actions Skill

## Workflow Structure
Every `.github/workflows/*.yml` must contain:
- `name:`
- `on:` (with `schedule:` for cron, or `workflow_dispatch:` for manual)
- `jobs:` with at least one job (`build:` or `post:`)
- `secrets:` or `env:` references via `${{ secrets.XXX }}`
- `concurrency:` group per workflow

## Concurrency
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Secrets Reference
- `SITE_URL`
- `FEED_URL` / `FEED_URLS`
- `DISCORD_WEBHOOK_URL`
- `DISCORD_STATUS_WEBHOOK_URL`
