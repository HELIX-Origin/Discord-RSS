# 🤖 Discord Bot & Commands

HELIX RSS operates as a Discord application using a **native connection** — a Gateway WebSocket for live events (`src/bot/gateway.ts`) and the Discord REST API for interactions and messages (`src/bot/rest.ts`). No `discord.js` dependency is required. It delivers notifications directly to channels, eliminating the need to manage external webhooks.

---

## ⚡ Slash Commands Reference

All commands register through Discord's native interaction model and use ephemeral response flags where appropriate (e.g. errors), with owner/team detection for elevated bot features.

| Command | Subcommands / Options | Permissions Required | Description |
| :--- | :--- | :--- | :--- |
| `/feed add` | `url: <string>`, `channel: <channel>`, `role: <role?>`, `color: <hex?>` | `Manage Channels` or `Administrator` | Adds a new feed subscription to a channel. |
| `/feed list` | `channel: <channel?>` | `Manage Channels` or `Administrator` | Displays all active feed subscriptions on the server. |
| `/feed remove` | `id: <feed_id>` | `Manage Channels` or `Administrator` | Removes an existing feed subscription by ID. |
| `/feed test` | `id: <feed_id>` | `Manage Channels` or `Administrator` | Dispatches a sample notification to verify permissions & format. |
| `/stats` | *None* | Everyone | Displays bot uptime, memory usage, and delivery analytics. |
| `/about` | *None* | Everyone | Shows version info, repository links, and developer credits. |
| `/help` | `topic: <string?>` | Everyone | Interactive documentation browser with command usage tips. |

---

## 🔒 Required Discord Bot Permissions

When inviting the bot to your Discord server, ensure it is granted the following permissions in target channels:

| Permission Name | Flag | Purpose |
| :--- | :--- | :--- |
| **View Channel** | `ViewChannel` | Discover channel and read status |
| **Send Messages** | `SendMessages` | Post text notifications and role mentions |
| **Embed Links** | `EmbedLinks` | Render rich embed cards with thumbnails and links |
| **Attach Files** | `AttachFiles` | Upload images/banners when remote hotlinking is blocked |
| **Mention Everyone / Roles** | `MentionEveryone` | Ping configured notification roles (`@role`) |
| **Use External Emojis** | `UseExternalEmojis` | Display custom source platform icons |

---

## 🎨 Rich Embed Formatting & Customization

Notifications are styled using Discord rich embeds:

```
┌───────────────────────────────────────────────────────────┐
│ 🔴 [YouTube] Google DeepMind                               │
│ ───────────────────────────────────────────────────────── │
│ Introducing Gemini 2.0 & Autonomous Coding Agents         │
│                                                           │
│ Discover how modern foundation models empower developer   │
│ workflows with agentic code generation and testing...     │
│                                                           │
│ 📅 Published: Sep 11, 2026 • ⏱️ Duration: 12:45           │
│ ───────────────────────────────────────────────────────── │
│ 🔗 Watch on YouTube (https://youtu.be/...)                │
│ [ High-Resolution Video Poster Thumbnail Banner ]         │
└───────────────────────────────────────────────────────────┘
```

- **Custom Colors**: Each feed can specify a unique hex color (e.g. `#FF0000` for YouTube, `#FF4500` for Reddit, `#0078F2` for Epic Games).
- **Author Branding**: Source platforms and storefronts display their high-resolution official branding icons.
- **Smart Truncation**: Descriptions exceeding Discord embed character limits (4,096 chars for description, 256 for title) are cleanly truncated at word boundaries with ellipsis (`...`).
- **Role Mentions**: Configured role mentions are prepended to the message payload, triggering push notifications for subscribed server members.
