---
title: phpBB Integration
description: Guide for integrating phpBB forums with the Discord RSS self-hosted service.
page: phpbb
---

# phpBB integration

phpBB ships with a built-in syndication feed generator at `feed.php`. It can expose forums, topics, and user activity.

## Find the RSS/Atom feed URL

1. Visit the forum board you want to follow.
2. Scroll to the bottom of the board and look for a **Feed** icon or link.
3. Common patterns:
   - `https://example.com/forum/feed.php?f=123`
   - `https://example.com/forum/feed.php?f=123&mode=topics`
   - `https://example.com/forum/feed.php?mode=topics_active`
   - `https://example.com/forum/feed.php?mode=news`

## Test the feed

Open the URL in an **incognito/private** window. If you see XML, the feed is public and can be added to Discord RSS as an **RSS/Atom feed**.

If you are redirected to a login page or receive a permission error, the feed is authenticated.

## Authenticated feeds

phpBB uses a session cookie (`phpbb3_xxx_sid`) and sometimes a `phpbb3_xxx_u` user cookie. Discord RSS does not currently send arbitrary cookies, so use a host-side proxy or a public scrape target.

### Option A: Cloudflare Browser Rendering

If the board is behind Cloudflare:

1. Connect your Cloudflare account in the dashboard **Integrations** tab.
2. Create a **Scrape feed** for the board URL.
3. Example selectors for topic rows:
   - container: `.topiclist .row`
   - title: `.topictitle`
   - link: `.topictitle`
   - time: `time`

### Option B: Cookie jar proxy

Host a small proxy that:

1. Logs into phpBB (`ucp.php?mode=login`) with a dedicated account.
2. Saves the `phpbb3_xxx_sid` cookie.
3. Exposes `http://localhost:9999/phpbb-feed?f=123`, fetches `feed.php?f=123` with the cookie, and returns the XML.

Add the proxy URL as an RSS feed in Discord RSS.

Example cookies to forward:

```text
Cookie: phpbb3_xxx_sid=abc123; phpbb3_xxx_u=2
```

> Keep credentials out of the repository; run the proxy as a separate secret-backed service.

### Option C: Scrape guest-visible content

If the forum has a "recent topics" or "active topics" page visible to guests:

- URL: `https://example.com/forum/search.php?search_id=active_topics`
- Create a **Scrape feed** and use selectors like:
  - container: `.topiclist .row`
  - title: `.topictitle`
  - link: `.topictitle`

## Enabling feeds in phpBB

Some boards disable syndication. If you own the board, enable it in **ACP → General → Board configuration → Feed settings**.

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `404 Not Found` | Feeds disabled or URL wrong | Check ACP feed settings |
| `403 Forbidden` | Cloudflare challenge | Use Cloudflare integration or proxy |
| `You are not authorised...` | Feed requires login | Use cookie proxy or scrape public page |
| Duplicate posts | `guid` not stable | Dedupe uses `link`; ensure links are absolute |

## See also

- [Forum integration overview](./forum-integration.md)
- [vBulletin integration](./vbulletin.md)
