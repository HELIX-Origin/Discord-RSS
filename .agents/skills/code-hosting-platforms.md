# Code Hosting Platforms Skill

## GitHub Integration (`gh`)
- Issue creation: `gh issue create --title "[BUG-XXX] ..." --body-file ".agents/bugs/template.md" --label "bug"`
- Issue tracking: All bugs mirrored in `HELIX-Origin/Site-Feed-Discord/issues`.
- Repository secrets configured via Settings -> Secrets and variables -> Actions.

## CI/CD Pipeline
- `.github/workflows/post-feed-to-discord.yml`
- `.github/workflows/site-status-alert.yml`
- Both must reference secrets via `${{ secrets.XXX }}`.
