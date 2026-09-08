# vBulletin integration

vBulletin 3/4/5 exposes an external feed generator at `external.php`. vBulletin 5 Cloud uses different routes, but the same concepts apply.

## Find the RSS feed URL

1. Visit the forum board you want to follow.
2. Look for an RSS icon or add `?type=RSS2` to the board URL.
3. Common patterns:
   - `https://example.com/forum/external.php?type=RSS2&forumids=123`
   - `https://example.com/forum/external.php?type=RSS2&forumids=1,2,3`
   - `https://example.com/forum/external.php?type=RSS2&lastpost=1`

## Test the feed

Open the URL in an **incognito/private** window. If you see XML, the feed is public and you can paste it directly into Discord RSS as a **RSS/Atom feed**.

If you get a login page or "no permission" error, the feed is authenticated.

## Authenticated feeds

vBulletin checks the `bbuserid` and `bbpassword` cookies (or a session cookie) for protected content. Discord RSS does not currently send arbitrary cookies, so use one of these host-side options:

### Option A: Cloudflare Browser Rendering

If the forum is behind Cloudflare and you see a challenge page:

1. Connect your Cloudflare account in the dashboard **Integrations** tab.
2. Create a **Scrape feed** instead of an RSS feed.
3. Use selectors that match thread rows on the board page, for example:
   - title: `.threadtitle a`
   - link: `.threadtitle a`
   - time: `.threadlastpost dl dd`

### Option B: Cookie jar proxy

Run a tiny service on the same host that:

1. Logs into the forum with a dedicated account (POST to `login.php?do=login`).
2. Stores the session cookie.
3. Exposes `http://localhost:9999/vbulletin-feed?f=123`, fetches `external.php?type=RSS2&forumids=123` with the cookie, and returns the XML.

Then add the proxy URL as an RSS feed in Discord RSS.

Example cookie values to forward:

```text
Cookie: bbuserid=12345; bbpassword=abcd1234...; bbsessionhash=...
```

> Keep the proxy and its credentials in a secrets manager, not in this repository.

### Option C: Scrape the guest-visible page

If the forum shows a "latest posts" block to guests, use a **Scrape feed** with selectors like:

- container: `#content li`
- title: `.title a`
- link: `.title a`

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `403 Forbidden` | Cloudflare challenge | Use Cloudflare integration or proxy |
| `200 OK` but HTML, not XML | Wrong URL or feed disabled | Check the feed URL pattern |
| Old posts keep re-posting | `guid` or `link` changed between polls | Use stable URLs, dedupe by link |

## See also

- [Forum integration overview](./forum-integration.md)
- [phpBB integration](./phpbb.md)
