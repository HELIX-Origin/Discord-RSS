# Status Monitors

HELIX RSS includes a native website health monitoring agent that periodically polls HTTP/HTTPS endpoints and sends formatted alerts to your Discord channels.

---

## ⚡ Transition-Only Alerting

Unlike noisy monitors that post messages on every ping, HELIX RSS employs **transition-only notification**:

- **Site Goes Down (`online` ➔ `down`)**: Sends an immediate high-priority red alert embed with HTTP status code and failure details.
- **Site Recovers (`down` ➔ `online`)**: Sends a green recovery notice with calculated downtime duration.
- **Stable State (`online` ➔ `online` or `down` ➔ `down`)**: Updates the internal database and dashboard statistics silently without sending redundant Discord messages.

---

## 🛠️ Adding a Status Monitor

### Via the Web Dashboard

1. Open the **Status Monitors** tab.
2. Click **Add Monitor**.
3. Fill in the details:
   - **Name**: e.g., `Main API Server`
   - **Target URL**: e.g., `https://api.example.com/health`
   - **Expected Status Code**: e.g., `200`
   - **Notification Channel**: The Discord channel that receives alerts when an outage or recovery occurs.
4. Click **Save Monitor**.

### Via Discord Slash Command

```
/monitor add name:Production API url:https://api.example.com/health channel:#server-status
```

---

## ⏱️ Timing & Timeouts

Status checks run on a background timer controlled by your environment configuration:

- `STATUS_INTERVAL_MS`: How often all configured monitors are evaluated (default: `30000` = every 30 seconds).
- `REQUEST_TIMEOUT_MS`: The maximum time to wait for a response before declaring an endpoint down (default: `15000` = 15 seconds).
