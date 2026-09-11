# Privacy Policy for HELIX RSS

**Last Updated**: September 11, 2026

Welcome to **HELIX RSS**. This Privacy Policy explains how our self-hosted RSS/Atom-to-Discord service handles information when you use the software, dashboard, and associated Discord bot.

---

## 1. Core Principle: Self-Hosted & Zero Telemetry

HELIX RSS is an open-source, self-hosted application.
- **No Third-Party Tracking**: We do not collect, transmit, sell, or analyze your personal information.
- **No Analytics / Telemetry**: The application contains zero tracking cookies, remote analytics beacons, or centralized diagnostic pingbacks.
- **Local Data Custody**: All database records (feeds, articles, users, logs) reside exclusively on the server or filesystem managed by the instance administrator.

---

## 2. Information Handled by the Service

When operating an instance of HELIX RSS, the software stores and processes the following data locally within an embedded SQLite database (`helix-rss.db`):

### A. Discord Account & OAuth Data
- **Discord User ID & Username**: Used to authenticate administrators and members for dashboard access.
- **Guild (Server) and Channel IDs**: Used to identify channels where RSS feed updates are posted.
- **OAuth Access Tokens**: Stored locally in encrypted/session cookies solely to manage authenticated sessions with the Discord API. Tokens are never transmitted to external third parties.

### B. Feed Configurations
- **Feed URLs & Titles**: Target RSS/Atom feed links and scrape URLs provided by users.
- **Delivery Preferences**: Channel routing IDs, ping roles, and custom filter rules.
- **Sent Entry Cache**: Feed article GUIDs or URLs stored locally to deduplicate and prevent repeat notifications.

### C. Local Dashboard Accounts
- If local dashboard registration is enabled, encrypted password hashes (using Node.js native scrypt/crypto) and email addresses are stored in the local SQLite database.

---

## 3. External Network Interactions

To perform its intended functions, HELIX RSS initiates outgoing network requests to:
1. **Discord API (`discord.com`)**:
   - Deliver rich embeds to designated server channels via the configured Discord Bot token.
   - Register slash commands (`/feed`, `/stats`, `/about`, `/help`).
   - Authenticate users via Discord OAuth2.
2. **Configured Feed Sources**:
   - Periodically poll public RSS, Atom, or webpage endpoints provided by users.
   - Fetched content is parsed in-memory and committed to local cache.

---

## 4. Data Retention & Erasure

Because HELIX RSS is self-hosted:
- **Feed Deletion**: Deleting a feed from the dashboard or via `/feed remove` immediately purges its configuration and associated delivery logs from the local database.
- **Account Deletion**: Instance administrators can delete users via the Settings tab or directly query SQLite.
- **Complete Erasure**: Deleting the local `data/helix-rss.db` file permanently removes all stored data.

---

## 5. Security Measures

- **Native Node.js Security**: Uses Node.js native HTTP/HTTPS and cryptography libraries with zero unnecessary runtime dependencies.
- **HTTPS & Secure Cookies**: Session cookies are automatically tagged with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes over HTTPS connections.
- **Role-Based Access Control (RBAC)**: Only authorized server owners and administrators have permission to alter service settings.

---

## 6. Contact & Open Source Inquiries

For questions regarding the open-source software, security disclosures, or feature requests, visit:
- **Repository**: [https://github.com/HELIX-Origin/HELIX-RSS](https://github.com/HELIX-Origin/HELIX-RSS)
- **Discord Community**: [HELIX Origin Discord](https://discord.com/invite/Ww3XBZC2HV)
