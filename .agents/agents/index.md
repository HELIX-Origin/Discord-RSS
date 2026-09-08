# Agents Index

This directory contains specialized agent files for Site-Feed-Discord project domains. Each agent definition details domain architecture, script locations, workflow configurations, environment requirements, and integration guidelines.

## Available Agents

### Project Domain Agents

| Agent | Target Domain | Description | Agent File |
|-------|--------------|-------------|------------|
| **feed-bot** | RSS/Atom feeds, Python scripts, GitHub Actions | Feed discovery, filtering, Discord webhook posting, state persistence | [feed-bot.md](feed-bot.md) |
| **status-monitor** | Site status, transition alerts, separate webhook | Availability polling, false-positive suppression, state file tracking | [status-monitor.md](status-monitor.md) |

## Usage
When working within the Site-Feed-Discord repository, reference the corresponding agent file to guide script modifications, workflow updates, state file handling, and testing conventions.
