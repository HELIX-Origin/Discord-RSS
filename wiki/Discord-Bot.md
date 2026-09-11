# Discord Bot & Slash Commands

HELIX RSS includes a built-in, native Discord Bot that connects directly to the Discord Gateway and registers interactive global slash commands.

---

## 🛠️ Discord Developer Portal Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Name your application (e.g., `HELIX RSS`) and save.
3. Under **General Information**, copy your **Application ID** and set `DISCORD_CLIENT_ID=<id>` in `.env`.
4. Under **OAuth2** -> **General**, reset and copy your **Client Secret**, then set `DISCORD_CLIENT_SECRET=<secret>` in `.env`.
5. Under the **Bot** tab:
   - Click **Reset Token** and copy the bot token. Set `DISCORD_TOKEN=<token>` in `.env`.
   - Enable **Server Members Intent** and **Message Content Intent** if using extended member lookup.
6. Under **OAuth2** -> **URL Generator**:
   - Select Scopes: `bot`, `applications.commands`
   - Select Bot Permissions: `Manage Webhooks`, `Send Messages`, `Embed Links`, `View Channels`, `Read Message History` (or `Administrator`).
   - Copy the generated URL and save it as `DISCORD_REDIRECT_URL` in `.env`.

---

## 👑 Automatic Owner Detection

HELIX RSS automatically links your developer identity to the dashboard without hardcoded usernames or manual database changes:

1. On startup, the bot queries the Discord Application API (`/applications/@me`).
2. It detects the application **Owner User ID** (or **Developer Team Members**).
3. When you click **"Log In with Discord"** on the web dashboard:
   - If your Discord ID matches the detected application owner, you are automatically assigned the **Owner** (`owner`) role!
   - If you belong to the Discord developer team with administrative privileges, you are granted the **Admin** (`admin`) role.
   - All other Discord users authenticate as standard members (`member`).

---

## 💬 Slash Commands Reference

All commands are registered globally and available in any Discord server where the bot is present.

### `/feed` — Feed Management

| Subcommand     | Arguments                                                                                                  | Description                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/feed add`    | `name` (required)<br>`url` (required)<br>`channel` (optional)<br>`feed_type` (optional: `rss` or `scrape`) | Adds a new feed. If `channel` is specified, the bot automatically creates a webhook in that channel. |
| `/feed list`   | _none_                                                                                                     | Displays all feeds configured for this Discord server.                                               |
| `/feed remove` | `id` (required, feed ID or name)                                                                           | Removes the feed subscription.                                                                       |
| `/feed poll`   | `id` (required, feed ID or name)                                                                           | Manually triggers an immediate poll of the feed.                                                     |
| `/feed toggle` | `id` (required)<br>`enabled` (true/false)                                                                  | Enables or pauses automatic polling for the feed.                                                    |

### `/webhook` — Webhook Management

| Subcommand        | Arguments                                 | Description                                           |
| ----------------- | ----------------------------------------- | ----------------------------------------------------- |
| `/webhook create` | `name` (required)<br>`channel` (required) | Generates and registers a new channel webhook.        |
| `/webhook list`   | _none_                                    | Lists all webhooks registered for the current server. |

### `/monitor` — Website Uptime Monitors

| Subcommand        | Arguments                                                     | Description                                                                       |
| ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/monitor add`    | `name` (required)<br>`url` (required)<br>`channel` (optional) | Registers a website URL to monitor for uptime.                                    |
| `/monitor list`   | _none_                                                        | Lists all website monitors and their current statuses (Online / Down / Degraded). |
| `/monitor remove` | `id` (required, monitor ID or name)                           | Deletes a status monitor.                                                         |
| `/monitor check`  | `id` (required, monitor ID or name)                           | Executes an on-demand HTTP health check.                                          |

### `/stats` — System Health & Diagnostics

- **Usage**: `/stats`
- **Output**: Returns service uptime, database size, active subscriptions, and an **"Add Bot to Server"** button.
