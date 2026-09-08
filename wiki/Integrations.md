# Integration Overview

This page provides an overview of integrating Discord RSS with various forums and platforms, including handling login-walled content and using APIs or service accounts.

## Forums

Many forums run on **vBulletin** or **phpBB** and hide content behind login walls. Discord RSS can still post updates from these forums, but you usually need one of the following approaches.

### Approaches

1. Use the forum's built-in RSS feeds

Both vBulletin and phpBB can expose RSS/Atom feeds for boards, threads, or user content. Some admins disable them, and some only expose them to logged-in users. This is the easiest approach when available.

- vBulletin: look for `/external.php?type=RSS2&forumids=123`.
- phpBB: look for `/feed.php?f=123` or `/feed.php?mode=topics`.

If the feed works in a browser where you are logged in but fails in Discord RSS, the feed is likely authenticated. See the cookie/session approach below.

2. Host-side cookie / session forwarding (advanced)

Discord RSS currently fetches feeds directly via Node.js `fetch`. Login-walled pages that require a session cookie cannot be read unless the service presents that cookie.

Options for the host:

1. **Proxy with persistent cookies.** Run a small local proxy (e.g. `puppeteer`, `playwright`, or a custom cookie-jar service) that logs into the forum once and exposes a feed URL Discord RSS can poll unauthenticated. This keeps forum credentials out of Discord RSS entirely.
2. **Scrape public HTML.** If the content you care about is visible to guests (no login required), create a **Scrape feed** in Discord RSS with CSS selectors for thread titles/links. No cookies are needed.
3. API key / service account

Some large forums offer an API or allow creating a "bot" user whose session cookie can be used for RSS. This is forum-specific and documented in the per-platform pages.

### Security notes

- **Never commit forum credentials or session cookies to the repository.** Store them in the proxy or secrets manager, not in `.env` or the dashboard.
- Discord RSS stores webhooks, feeds, monitors, and OAuth credentials in its SQLite database. It does not store arbitrary HTTP headers or cookies today.
- If you need header/cookie support for a feed, open a feature request; the current architecture can be extended without breaking existing feeds.

### Next steps

- Read the per-platform integration guides for detailed instructions on setting up Discord RSS with your forum software.

- [vBulletin integration guide](./Integrations/vbulletin.md)
- [phpBB integration guide](./Integrations/phpbb.md)


## Cloudflare

> [!WARNING]
> Cloudflare Browser Rendering may incur additional costs depending on your Cloudflare plan. Ensure you understand the pricing before enabling this integration.

Cloudflare integration allows Discord RSS to bypass certain protections like JavaScript challenges and CAPTCHA by using Cloudflare's Browser Rendering service.

To enable Cloudflare integration:

1. Go to the **Integrations** tab in Discord RSS.
2. Click on **Cloudflare Browser Rendering** and follow the prompts to connect your Cloudflare account.
3. Once connected, Discord RSS will use Cloudflare's Browser Rendering service to fetch content from protected pages.

> [!NOTE]
> Cloudflare integration is currently a work in progress and may have limitations or changes in the future.
> We plan to add proper OAuth support for Cloudflare integration in the future. This way Cloudflare support can be per-user and more securely managed.
> There will be an optional .env configuration for Cloudflare integration, allowing hosts, to provide global Cloudflare integration in place of the per-user OAuth login button.