# 🩺 Troubleshooting & Frequently Asked Questions

This guide provides diagnostic steps and solutions for common issues encountered when running, deploying, or configuring HELIX RSS.

---

## 🔍 Diagnostic Decision Flowchart

```mermaid
flowchart TD
    Start[Issue Encountered] --> Type{What is failing?}
    Type -->|Feed Not Updating| F1[Check Feed URL in Browser / Validator]
    Type -->|Bot Not Posting| B1[Check Bot Channel Permissions]
    Type -->|Reddit 429 / Blocked| R1[Set Descriptive USER_AGENT]
    Type -->|Database Locked| D1[Check Concurrent Instances / Permissions]
    Type -->|OAuth Login Fails| O1[Check DISCORD_CALLBACK_URL in Dev Portal]

    F1 -->|URL Valid| F2[Check Live Logs in Dashboard / Settings]
    B1 -->|Missing Perms| B2[Grant View Channel, Send Messages, Embed Links]
    R1 -->|Still Blocked| R2[Use a longer dashboard posting interval]
    D1 -->|SQLite Busy| D2[Ensure single process; WAL mode already enabled]
    O1 -->|Mismatch| O2[Ensure exact match including http/https and port]
```

---

## ⚠️ Common Problems & Resolutions

### 1. Bot is Not Posting Feed Updates to Channel

**Symptoms**: Feeds appear active in the dashboard, but no messages appear in Discord.

**Solutions**:
1. **Verify Bot Channel Permissions**: Ensure the bot has `View Channel`, `Send Messages`, and `Embed Links` in the specific target channel or category overrides.
2. **Send a Test Message**: In the dashboard, click the **Send Test** button on the feed card. If an error is returned, review the error code (e.g. `50001: Missing Access` or `50013: Missing Permissions`).
3. **Check Feed Polling Timestamp**: Inspect `lastPolledAt` to ensure the background watcher loop is running.

---

### 2. Reddit Feeds Return `429 Too Many Requests`

**Symptoms**: Reddit feeds fail to refresh and logs show HTTP 429 status.

**Solutions**:
1. Configure a descriptive User-Agent in `.env`:
   ```env
   USER_AGENT="HelixRSS/0.1.0 (by /u/YourRedditUsername)"
   ```
2. Avoid short delivery intervals for Reddit feeds — use the dashboard's 10–60 minute posting options for high-volume subscriptions.
3. If monitoring multiple subreddits, combine them into a single multi-reddit feed (`r/sub1+sub2+sub3`) instead of creating separate feeds.

---

### 3. OAuth2 "Invalid OAuth2 Redirect URL"

**Symptoms**: Clicking "Login with Discord" redirects to a Discord error page saying the redirect URL is invalid.

**Solutions**:
1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application and navigate to **OAuth2 -> General**.
3. Under **Redirects**, add the exact redirect URI matching `DISCORD_CALLBACK_URL` (e.g., `http://localhost:3131/api/auth/callback/discord` or `https://rss.yourdomain.com/api/auth/callback/discord`).
4. Ensure trailing slashes and HTTP vs HTTPS protocols match exactly.

---

### 4. SQLite `database is locked` / `SQLITE_BUSY`

**Symptoms**: Log contains `Error: SQLITE_BUSY: database is locked`.

**Solutions**:
1. Ensure only **one instance** of HELIX RSS is accessing the SQLite database file at a time (e.g., avoid running multiple containers sharing the same volume without clustering).
2. The database runs in **WAL mode** (`PRAGMA journal_mode = WAL`), which already mitigates most read/write contention. SQLite is the only supported engine.

---

### 5. Free Games Feed Not Announcing Giveaways

**Symptoms**: A new free game promotion is live on Epic Games Store or Steam, but no message has been sent.

**Solutions**:
1. Free Games feeds run on an automated **daily** polling schedule.
2. Verify that `FREE_GAMES_MIN_PRICE=0` in `.env` (if set higher, deals below that original retail price are filtered out).
3. Check the Service Logs for any source errors or rate-limit responses.

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><strong>Q: Does HELIX RSS require webhook URLs for each channel?</strong></summary>

> **No**. HELIX RSS connects directly using the Discord Bot Token and Discord REST API. You only need to select target channels from the dropdown.
</details>

<details>
<summary><strong>Q: Can I format Reddit feeds to only post the image banner without text?</strong></summary>

> **Yes!** In the Reddit Feeds tab, toggle the mode switcher to **Pure Image Mode** (`feedType: 'reddit'`).
</details>

<details>
<summary><strong>Q: How many feeds can I add to a single server?</strong></summary>

> There is no hardcoded software limit. Thousands of feeds can be tracked concurrently with appropriate `FEED_CONCURRENCY` and memory allocation.
</details>
