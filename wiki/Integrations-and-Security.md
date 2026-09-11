# Integrations, Security & Access Control

HELIX RSS provides robust authentication, role-based permissions, and integrations designed specifically for Discord community hosts.

---

## 🔐 Discord-Only Authentication

HELIX RSS has transitioned exclusively to **Discord OAuth authentication**:

- **No Passwords**: Eliminates credential stuffing, password storage risks, and cumbersome registration forms.
- **Single-Click Authentication**: Users click **"Continue with Discord"**; accounts and sessions are provisioned on-the-fly.
- **Zero Configuration for End-Users**: Members can immediately view their feeds and status checks as soon as they authorize via Discord.

---

## 👑 Role-Based Access Control (RBAC)

The service enforces a three-tier permission hierarchy:

| Role       | Badge     | Permissions                                                                                                                                                                                                                               |
| ---------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**  | 👑 Gold   | Complete administrative control. Can access Dev Tools, trigger SQLite vacuum/optimizations, edit OAuth credentials, and promote or demote other users between `admin` and `member`. Automatically assigned to Discord Application Owners. |
| **Admin**  | 🛡️ Purple | Can configure service integrations, add global feeds, and inspect system diagnostics. Cannot promote other users or modify Owner permissions.                                                                                             |
| **Member** | 👤 Gray   | Standard access. Can manage their personal feeds, webhooks, monitors, and connected Discord accounts. Cannot access system settings or dev tools.                                                                                         |

---

## ☁️ Cloudflare Access OAuth Integration

When fetching feeds from domains protected by **Cloudflare Zero Trust / Cloudflare Access**:

1. Configure an OAuth application in your Cloudflare Zero Trust dashboard.
2. In `.env`, provide:
   ```env
   CLOUDFLARE_CLIENT_ID=your_cloudflare_client_id
   CLOUDFLARE_CLIENT_SECRET=your_cloudflare_client_secret
   ```
3. Set `PUBLIC_URL` to your instance’s public HTTPS address so Cloudflare can route the OAuth callback back to your server.
4. On the **Integrations** tab in the dashboard, click **Connect** next to Cloudflare to authorize your session.

---

## 🔒 HTTPS & Reverse Proxy Configuration

HELIX RSS supports both direct TLS/HTTPS and operation behind reverse proxies (Cloudflare, Nginx, Caddy, Traefik).

### Native HTTPS

Provide paths to your certificate and private key in `.env`:

```env
SITE_SSL_KEY=./certs/privkey.pem
SITE_SSL_CERT=./certs/fullchain.pem
```

### Reverse Proxy Support

When running behind a proxy, HELIX RSS automatically inspects:

- `X-Forwarded-Proto` (or `X-Forwarded-Ssl`)
- `X-Forwarded-Host`
- `Host`

Session cookies automatically adapt: the `Secure` flag is applied whenever the client connects via HTTPS, and dropped on localhost HTTP to ensure development remains effortless.
