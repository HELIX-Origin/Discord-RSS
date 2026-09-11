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

## ☁️ Cloudflare Access OAuth & WAF Integration

HELIX RSS integrates with Cloudflare to fetch feeds behind **Cloudflare Zero Trust / Cloudflare Access** and allow sites to bypass Cloudflare security checks (WAF, Bot Fight Mode, Rate Limiting, Browser Integrity Check) for the feed crawler.

### 1. Cloudflare OAuth Setup (Public Client / Code Flow)

Cloudflare supports standard OAuth 2.0 Authorization Code grant:

1. In the Cloudflare Dashboard, navigate to **Manage Account** > **OAuth clients** > **Create client**.
2. **Client Configuration**:
   - **Client Type**: Public / SPA / Native client (uses `token_endpoint_auth_method: "none"`).
   - **Redirect URI**: `https://<YOUR_DOMAIN>/api/oauth/cloudflare/callback` (or `http://localhost:3434/api/oauth/cloudflare/callback` for local testing).
   - **Client Secret**: When configuring public / code-only authorization, Cloudflare only issues a **Client ID** (no client secret). HELIX RSS natively supports this mode without demanding a secret.
   - **Scopes**: Cloudflare requires **dot-delimited** scopes (e.g. `zone.read`, `zone.rulesets.write`, `offline_access`). Note that legacy colon-delimited formats (`zone:read`) are rejected by Cloudflare's OAuth server. If no scope is explicitly passed, Cloudflare applies the scopes configured on the client.
3. In `.env`, provide:
   ```env
   CLOUDFLARE_CLIENT_ID=your_cloudflare_client_id
   # CLOUDFLARE_CLIENT_SECRET is optional for public / code-based OAuth
   CLOUDFLARE_CLIENT_SECRET=
   ```
4. On the **Integrations** tab in the HELIX RSS dashboard, click the **Connect** button next to Cloudflare. Complete authorization in Cloudflare; your access token is automatically stored in SQLite.

---

### 2. Cloudflare WAF Ruleset Bypass for Feeds

To ensure HELIX RSS can fetch feeds from your Cloudflare-protected domains without triggering 403 Forbidden, 503 challenges, or Turnstile blocks:

#### Crucial Considerations:
- **User-Agent Matching**: HELIX RSS identifies itself with `HelixRSS/0.1 (+https://github.com/HELIX-Origin/HELIX-RSS)` (`src/feed/fetch.ts`). Your WAF rule must match `(http.user_agent contains "HelixRSS")`.
- **Feed Path Freedom**: Do not restrict rules to path `/feed`. Feeds often reside at `/rss.xml`, `/atom.xml`, `/feed.xml`, `/index.xml`, or domain roots.
- **Rule Ordering (`position`)**: Cloudflare evaluates rules sequentially. The `skip` action **only** bypasses rules evaluated *after* it. Always specify `"position": { "index": 1 }` so the bypass rule executes before blocking rules.
- **Ruleset Discovery**: Custom WAF rules must be added to the zone's `http_request_firewall_custom` entry point ruleset.

#### Step-by-Step API Deployment:

1. **Get Zone ID**:
   ```bash
   curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=example.com" \
     -H "Authorization: Bearer $OAUTH_ACCESS_TOKEN" \
     -H "Content-Type: application/json"
   # Extract: .result[0].id -> $ZONE_ID
   ```

2. **Get Custom Firewall Ruleset ID**:
   ```bash
   curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_firewall_custom/entrypoint" \
     -H "Authorization: Bearer $OAUTH_ACCESS_TOKEN" \
     -H "Content-Type: application/json"
   # Extract: .result.id -> $RULESET_ID
   ```

3. **Deploy Skip Rule (Option A: Legacy Products + Current Ruleset)**:
   ```bash
   curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$RULESET_ID/rules" \
     --request POST \
     --header "Authorization: Bearer $OAUTH_ACCESS_TOKEN" \
     --header "Content-Type: application/json" \
     --data '{
       "description": "Bypass Cloudflare security checks for HELIX RSS Feed Fetcher",
       "expression": "(http.user_agent contains \"HelixRSS\")",
       "action": "skip",
       "action_parameters": {
           "ruleset": "current",
           "products": [
               "bic",
               "hot",
               "securityLevel",
               "rateLimit",
               "zoneLockdown",
               "uaBlock",
               "waf"
           ]
       },
       "position": {
           "index": 1
       },
       "enabled": true
   }'
   ```

4. **Deploy Skip Rule (Option B: Modern Phases Skip)**:
   *Bypasses Managed WAF, Rate Limiting, and Super Bot Fight Mode (SBFM). Note that Cloudflare API requires omitting `"ruleset"` when `"phases"` is provided:*
   ```bash
   curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$RULESET_ID/rules" \
     --request POST \
     --header "Authorization: Bearer $OAUTH_ACCESS_TOKEN" \
     --header "Content-Type: application/json" \
     --data '{
       "description": "Bypass Cloudflare security checks for HELIX RSS Feed Fetcher",
       "expression": "(http.user_agent contains \"HelixRSS\")",
       "action": "skip",
       "action_parameters": {
           "phases": [
               "http_request_firewall_managed",
               "http_ratelimit",
               "http_request_sbfm"
           ],
           "products": [
               "bic",
               "hot",
               "securityLevel",
               "zoneLockdown",
               "uaBlock"
           ]
       },
       "position": {
           "index": 1
       },
       "enabled": true
   }'
   ```

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
