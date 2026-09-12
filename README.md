<div align="center">
  <img src="banner.png" width="100%" alt="HELIX RSS Banner" />

  # 📡 HELIX RSS
  **A modern, self-hosted RSS, Web Scraper, Reddit, & Free Games syndication hub for Discord.**

  [![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE.md)
  [![Discord](https://img.shields.io/discord/1078749842602102875?color=5865F2&label=Discord&logo=discord&logoColor=white&style=flat-square)](https://discord.gg/Ww3XBZC2HV)
  [![Node.js](https://img.shields.io/badge/Node.js-v22.9.0%2B-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)
  [![Deploy on Heroku](https://img.shields.io/badge/Deploy%20to-Heroku-79589F?logo=heroku&logoColor=white&style=flat-square)](https://heroku.com/deploy?template=https://github.com/HELIX-Origin/HELIX-RSS)
</div>

---

## 📖 Overview

**HELIX RSS** is a lightweight, multi-user feed syndication engine and Discord bot built natively in TypeScript ESM. It automatically monitors RSS/Atom feeds, custom CSS webpage scrapers, curated subreddit streams, and weekly 100% OFF free game promotions—delivering clean, rich Discord embeds straight to your server channels without any webhook management overhead.

Featuring a built-in web dashboard, Discord OAuth2 authentication, zero frontend npm dependencies, SQLite persistent storage, and optional Redis clustering, HELIX RSS provides everything you need to keep your Discord community informed in real time.

---

## ✨ Core Features

### 🎮 Free Games Giveaway Alerts
- **Multi-Platform Support**: Official support for **Epic Games Store**, **Steam**, **GOG.com**, **IndieGala**, **Humble Bundle**, **Itch.io**, **Ubisoft Store**, **EA App / Origin**, **Prime Gaming**, and **Battle.net**.
- **Automated Monday Drops**: Runs on an automated weekly schedule (every Monday) with an instant manual polling trigger in the dashboard.
- **Rich Store Embeds**: Standardized Discord embeds with official store branding, high-contrast badges, pricing worth, expiration timers, and direct claim links.

### 🤖 Custom Reddit Feeds
- **Subreddit & User Feeds**: Subscribe to any subreddit (e.g. `r/technology`, `r/wallpapers`, `r/EarthPorn`), user stream, or custom `.rss` URL.
- **Dual Display Modes**:
  - 🖼️ **Pure Image Mode**: Extracts full-resolution images and animated GIFs while stripping out message text bodies.
  - 📰 **Standard RSS Mode**: Formats complete message prose, author badges, and dedicated discussion link fields.
- **Animated GIF Prioritization**: Automatically resolves and displays direct `.gif` animations and Imgur `.gifv` media.
- **Interactive Mode Switcher**: Toggle any active Reddit feed between Image and RSS mode in one click.

### 📰 Curated News Feeds Catalog
- **700+ Verified Presets**: One-click subscription to top publications across Technology, Artificial Intelligence, Gaming, Science, Cybersecurity, Hardware, Apple, Linux, Programming, Finance, and Entertainment.
- **Organized Categories**: Clean category grouping with automated Discord channel routing.

### 🕷️ Custom CSS Webpage Scraper
- **Scrape Any Site Without RSS**: Turn any website, blog, or forum into an automated Discord feed using standard CSS selectors (`itemSelector`, `titleSelector`, `linkSelector`, `descriptionSelector`).
- **Relative URL Resolution**: Automatically expands relative links (`/posts/123`) to full canonical HTTP addresses.

### 🎨 Uniform Standardized Embeds
- **Single Shared Width**: Uniform card layout across all feeds and platforms.
- **Structured Fields**: Links, source attribution, and metadata are cleanly placed in dedicated embed fields rather than cluttered inline text.

### 🤖 Discord Bot Integration
- **Direct Channel Delivery**: Delivers directly to text channels via the Discord REST API—no webhook creation or management required.
- **Slash Commands**: Interactive commands (`/feed`, `/stats`, `/about`, `/help`) for checking feed statuses directly in Discord.
- **Automatic Owner Detection**: Automatically grants full Owner rights to Discord Application owners and team members upon Discord login.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v22.9.0` or higher (uses native `node:sqlite`).
- **Discord Bot**: Application registered on the [Discord Developer Portal](https://discord.com/developers/applications).

### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/HELIX-Origin/HELIX-RSS.git
cd HELIX-RSS

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment (`.env`)

Edit `.env` and enter your Discord Application credentials:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
PORT=3131
PUBLIC_BASE_URL=http://localhost:3131
APP_REPO_URL=https://github.com/HELIX-Origin/HELIX-RSS
APP_REPO_USER_AGENT=HELIX-Origin/HELIX-RSS
```

### 3. Build & Run

```bash
npm install
npm run build
npm start
```

Open **`http://localhost:3131`** in your browser and click **Log In with Discord**!

---

## 🐳 Docker & VPS Deployment

### Docker Compose

```yaml
services:
  helix-rss:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - .:/app
      - ./data:/app/data
    ports:
      - "3131:3131"
    environment:
      - NODE_ENV=production
    command: sh -c "npm install && npm run build && npm start"
    restart: unless-stopped
```

### One-Click Heroku Deployment

Deploy instantly to Heroku with one click:

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/HELIX-Origin/HELIX-RSS)

### Linux systemd Service

Install HELIX RSS as a managed 24/7 background systemd service:

```bash
sudo ./scripts/install-service.sh
```

---

## 📚 Extensive Wiki & Documentation

Comprehensive guides, architecture breakdowns, configuration settings, and API specifications are maintained in the project wiki:

| Wiki Page | Description |
|---|---|
| [🏠 Wiki Home](wiki/HOME.md) | Central documentation index and quick reference. |
| [🎁 Free Games Feeds](wiki/Free-Games-Feeds.md) | Supported platforms, weekly Monday cron, manual poll triggers, and embed schemas. |
| [🤖 Reddit Feeds](wiki/Reddit-Feeds.md) | Pure Image vs Standard RSS modes, animated GIFs, sort filters, and presets. |
| [📰 Feeds & Web Scraper](wiki/Feeds-and-Scrapers.md) | RSS/Atom parsing, CSS webpage scrapers, and the 700+ News Feeds catalog. |
| [🤖 Discord Bot & Commands](wiki/Discord-Bot.md) | Developer Portal configuration, slash commands, direct channel delivery, and embed styling. |
| [🏗️ Architecture & Design](wiki/Architecture-and-Design.md) | SQLite schema, AppState in-memory caching, RedisCoordinator, and FeedWatcher engine. |
| [⚙️ Configuration Guide](wiki/Configuration.md) | Exhaustive reference for all `.env` environment variables and settings. |
| [🚀 Deployment & Hosting](wiki/Deployment-and-Hosting.md) | Docker, systemd, Heroku, Fly.io, Railway, VPS hosting, and native SSL. |
| [💻 Development & Testing](wiki/Development-and-Testing.md) | Developer environment setup, ESLint, Prettier, TypeScript, and build verification. |
| [🔒 Integrations & Security](wiki/Integrations-and-Security.md) | Discord OAuth2, session cookies, RBAC permissions, and anti-bot challenge detection. |
| [📡 REST API Reference](wiki/API-Reference.md) | Complete documentation of all dashboard, feed, and management REST endpoints. |
| [🔧 Troubleshooting Playbook](wiki/Troubleshooting.md) | Step-by-step diagnostic guide for common configuration and network errors. |

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are welcome!
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for code quality standards and git commit conventions.
- Report issues and request features on our [GitHub Issue Tracker](https://github.com/HELIX-Origin/HELIX-RSS/issues).

---

## 📄 License

This project is open source and available under the terms of the [MIT License](LICENSE.md).