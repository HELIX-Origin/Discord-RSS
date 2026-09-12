# 📖 HELIX RSS Documentation Wiki

Welcome to the comprehensive technical and operational wiki for **HELIX RSS** — the modern, high-performance RSS & web scraping feed delivery bot and web management dashboard for Discord communities.

---

## 🧭 Wiki Table of Contents

| Section | Description |
| :--- | :--- |
| [**📡 Feeds & Scrapers Engine**](Feeds-and-Scrapers.md) | Deep dive into XML/RSS/Atom parsing, YouTube, TikTok, Bluesky, and custom scrapers. |
| [**🎮 Free Games & Giveaways**](Free-Games-Feeds.md) | Multi-store aggregation (Epic Games, Steam, GOG, Humble, etc.), Monday cron scheduler, and store branding. |
| [**🤖 Reddit Feeds & Pure Image Mode**](Reddit-Feeds.md) | Reddit scraping, Pure Image Mode vs Standard RSS Mode, animated GIF/gifv banners, and subreddit filtering. |
| [**🤖 Discord Bot & Commands**](Discord-Bot.md) | Slash commands (`/feed`, `/stats`, `/about`, `/help`), direct channel + forum thread delivery, embed formatting, and Discord permissions. |
| [**🔌 REST API Reference**](API-Reference.md) | Complete documentation of all REST endpoints, request/response schemas, and query params. |
| [**🏗️ Architecture & Design**](Architecture-and-Design.md) | System components, data flow diagrams, background polling engine, caching, and state management. |
| [**⚙️ Configuration Guide**](Configuration.md) | Exhaustive reference of all `.env` variables, timeouts, polling, dashboard themes, and hosting settings. |
| [**🚀 Deployment & Hosting**](Deployment-and-Hosting.md) | Deployment guides for Docker, Docker Compose, VPS/PM2, systemd, and native SSL. |
| [**🧪 Development & Testing**](Development-and-Testing.md) | Local environment setup, test runner commands, TypeScript checking, and code style standards. |
| [**🔒 Integrations & Security**](Integrations-and-Security.md) | Discord OAuth2, Owner ID resolution, CSRF/XSS protection, rate limiting, and database security. |
| [**🩺 Troubleshooting & FAQ**](Troubleshooting.md) | Diagnostic flows for feed delivery failures, permission errors, Reddit 429s, and database locks. |

---

## 💡 Key System Highlights

```mermaid
flowchart TD
    subgraph Sources["External Content Sources"]
        RSS["Standard RSS / Atom / JSON Feeds"]
        News["News Feeds Catalog (700+ Presets)"]
        Games["Free Games (Epic, Steam, GOG, Humble, Prime...)"]
        Social["Reddit, YouTube, Bluesky, TikTok"]
    end

    subgraph CoreEngine["HELIX RSS Core"]
        Watcher["Background Feed Watcher (Polling Scheduler)"]
        Parser["Parser & Fallback Scrapers"]
        Dedup["Composite Multi-Factor Deduplication"]
        DB[(SQLite Database)]
        Bot["Native Discord Bot Engine (Gateway + REST API)"]
        Web["Native HTTP Web Dashboard & REST API"]
    end

    subgraph Discord["Discord Platform"]
        Channels["Target Server Guild Channels"]
        SlashCmd["User Slash Commands (/feed, /stats)"]
    end

    Sources -->|Poll/Scrape| Parser
    Watcher -->|Trigger Polls| Parser
    Parser --> Dedup
    Dedup <-->|Query/Store State| DB
    Dedup -->|New Articles| Bot
    Bot -->|Post Embeds| Channels
    SlashCmd <--> Bot
    Web <--> DB
    Web <--> Bot
```

### 🎯 Feature Overview
1. **Multi-Source Scraping**: Full native support for RSS 0.9x/1.0/2.0, Atom 1.0, JSON Feed, YouTube channels, Reddit subreddits, Bluesky feeds, and TikTok creators.
2. **Dedicated Free Games Aggregator**: Real-time promotions scraping across 10 major digital storefronts with store-specific badge icons and Monday weekly schedule.
3. **Dedicated Reddit Engine**: Switch seamlessly between **Pure Image Mode** (fullscreen meme & photo banners) and **Standard RSS Mode** (discussion excerpts and link cards).
4. **News Feeds Catalog**: Instant 1-click subscription to 700+ verified feeds across 15 popular news categories.
5. **No Webhook Hassle**: Messages are dispatched directly to guild channels using Discord REST API endpoints with granular role/user pings and embed color customization.
6. **Forum Thread Delivery**: Optional per-server delivery of each feed into its own dedicated thread inside a forum channel — kept open via keepalive polling, auto-rotated into a fresh thread when large (configurable from the dashboard Feeds tab).
7. **Glassmorphism Web Dashboard**: Real-time management interface with Discord OAuth2 login, feed analytics, log streaming, and preset browsing.
