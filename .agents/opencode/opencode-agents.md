# Opencode Agents

This file defines agent configurations for Site-Feed-Discord in the `.opencode/` ecosystem.

## Agent Definitions

### `feed-bot`
- **Role**: Monitor RSS/Atom feeds, filter entries, post new items to Discord via webhook.
- **Key Rules**: `rules/02-python-github-actions-architecture.md`, `rules/03-message-formatting.md`
- **Skills**: `skills/python.md`, `skills/rss-atom.md`, `skills/discord-webhooks.md`
- **Verification**: `python -m unittest discover -s tests -p "test_*.py"`

### `status-monitor`
- **Role**: Poll `SITE_URL` every 30 minutes, alert `DISCORD_STATUS_WEBHOOK_URL` only on state transition.
- **Key Rules**: `rules/00-agent-safety-compliance.md`, `rules/05-documentation-standards.md`
- **Skills**: `skills/web-basics.md`, `skills/github-actions.md`
- **Verification**: Manual trigger + webhook payload inspection.
