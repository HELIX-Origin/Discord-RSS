# Troubleshooting Guide

This guide covers common issues and resolutions when deploying and maintaining HELIX RSS.

---

## 🛑 Port Conflicts (`EADDRINUSE`)

### Root Cause

An earlier instance of Node or Redis was not cleanly terminated and is still holding onto port `3131` (Bot), `3132` (Site), or `3535` (Redis).

### Automatic Resolution

HELIX RSS automatically performs a preflight port sweep on startup and terminates lingering processes holding these ports.

### Manual Resolution (PowerShell)

To manually free the ports on Windows:

```powershell
# Check which process is using the port
Get-NetTCPConnection -LocalPort 3131, 3132, 3535 -ErrorAction SilentlyContinue | Format-Table -Property LocalPort, OwningProcess

# Kill the process by PID
Stop-Process -Id <OwningProcessId> -Force
```

---

## 🗄️ Redis Diagnostics

### Behavior

- If `redis-server` is installed in `PATH` or `C:\Program Files\Redis\`, HELIX RSS automatically spawns it on port `3535`.
- If Redis fails to connect or is absent, the application logs:
  `Redis unreachable at redis://127.0.0.1:3535; running in standalone (single-instance) mode`
- The service will **not** hang or crash; it seamlessly continues running with local in-memory deduplication and SQLite.

### Verifying Redis Connection

Run:

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 3535
```

---

## 🤖 Discord Bot & Gateway Issues

### Bot Does Not Come Online

1. Verify `DISCORD_TOKEN` in `.env` has no quotes or extra whitespace.
2. Ensure you have enabled **Privileged Gateway Intents** in the [Discord Developer Portal](https://discord.com/developers/applications):
   - **Server Members Intent**
   - **Message Content Intent**

### Slash Commands Not Showing Up in Discord

1. Global slash commands can take a few minutes to populate across all Discord clients. Restarting your Discord desktop client (`Ctrl + R`) forces an immediate sync.
2. Confirm `DISCORD_CLIENT_ID` in `.env` matches the Application ID in the Developer Portal.

---

## 📬 Discord Channel Delivery Failures

### Missing Permissions / Unknown Channel

Ensure the bot has `View Channel` and `Send Messages` (and `Embed Links`) permissions in the target channel. If the channel was deleted, update the feed's target channel in the HELIX RSS dashboard.

### 429 Too Many Requests

Discord is rate-limiting message delivery. HELIX RSS automatically enforces rate-limiting per feed according to your configured interval and backs off using the `Retry-After` header. If rate limits persist, select a longer posting interval (e.g. 30 minutes or 1 hour) in the dashboard Feeds tab.

---

## 💾 SQLite Maintenance & Dev Tools

Owners and Admins can access built-in database maintenance:

1. Navigate to the **Dev Tools** tab on the dashboard.
2. Click **Optimize SQLite Database** (`POST /api/admin/optimize`).
3. This runs `PRAGMA wal_checkpoint(TRUNCATE)` and `VACUUM` to reclaim disk space and maintain peak query performance.

---

## 🔏 Self-Signed Certificate Warnings (`net::ERR_CERT_AUTHORITY_INVALID`)

### Root Cause
When accessing HELIX RSS over direct HTTPS using self-signed development certificates or non-public authority keys, browsers will display a security warning.

### Quick Fix
- **For Local Testing / Private IP Access**: Click **Advanced -> Proceed to site** to access the dashboard.
- **For Production Access**: Use a valid CA-signed certificate (Let's Encrypt, ZeroSSL, or Cloudflare Origin CA) and specify the paths in `.env` via `SITE_SSL_CERT` and `SITE_SSL_KEY`, or terminate SSL via an external reverse proxy (Nginx / Cloudflare).

---

## ⚙️ systemd Service Diagnostics (`helix-rss.service`)

### Service Fails to Start (`status=203/EXEC` or `status=217/USER`)

- **`status=203/EXEC` (Executable Not Found):**
  The path to `npm` in `ExecStart` is incorrect. Run `which npm` on your server (e.g. `/usr/bin/npm` or `/usr/local/bin/npm`) and update `ExecStart` in `/etc/systemd/system/helix-rss.service`.
- **`status=217/USER` (User Not Found):**
  The user configured in `User=` or `Group=` does not exist on your system. Update to your current username (e.g. `User=ubuntu` or `User=debian`).
- **Reload after editing:**
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl restart helix-rss
  ```

### Permission Denied Writing to `./data`

Ensure the user running the service owns the `./data` directory:
```bash
sudo chown -R $USER:$USER /opt/helix-rss/data
```

### Inspecting Detailed Failure Logs

View the full systemd journal stream with stack traces:
```bash
sudo journalctl -u helix-rss -e --no-pager
```
