# Feeds & Web Scraper

HELIX RSS provides native parsing for standard RSS and Atom feeds, as well as a webpage scraper for sites that do not publish an RSS or Atom feed.

---

## 📡 RSS & Atom Feeds

### Supported Formats

- **RSS 2.0** (`<rss version="2.0">` with `<channel>` and `<item>`)
- **Atom 1.0** (`<feed xmlns="http://www.w3.org/2005/Atom">` with `<entry>`)
- **XML Entities**: Automatic decoding of numeric (`&#123;`, `&#x7B;`) and named (`&amp;`, `&quot;`, `&lt;`, `&gt;`) entities.
- **GUID Resolution**: Resolves unique IDs from `<guid>`, `<id>`, or falls back to a cryptographic hash of link + title.

### Adding an RSS Feed via Web Dashboard

1. Go to the **Feeds** tab.
2. Click **Add Feed**.
3. Provide:
   - **Feed Name**: A friendly label (e.g. `TechCrunch News`).
   - **Feed URL**: The XML endpoint (e.g. `https://techcrunch.com/feed/`).
   - **Delivery Webhook**: Choose the Discord channel webhook.
4. Click **Create Feed**.

---

## 🕷️ Webpage Scraper & Feed Builder

For websites without an RSS feed (e.g. documentation updates, store restocks, status pages), HELIX RSS includes a built-in scraper that extracts structured feed items from raw HTML.

### CSS Selector Mapping

- **Item Container Selector**: CSS selector matching each repeatable item (e.g., `article.post`, `.blog-card`, `.news-item`).
- **Title Selector**: CSS selector for the headline within each item (e.g., `h2.title`, `a.header-link`).
- **Link Selector**: CSS selector for the item link (e.g., `a[href]`). Absolute and relative URLs (`/posts/1`) are resolved automatically.
- **Description / Content Selector**: Optional CSS selector for teaser text or summary.

### Visual Feed Builder

The **Feed Builder** tab allows you to test any public webpage URL in real time:

1. Enter the target website URL.
2. Click **Inspect Page**.
3. HELIX RSS tests HTML structure, extracts matching sample items, and verifies your selectors before saving.

---

## 🌟 Popular Feed Presets

The **Popular Feeds** tab provides one-click templates:

- **GitHub Releases**: Track releases for any repository (`https://github.com/:owner/:repo/releases.atom`).
- **YouTube Channels**: Monitor new videos for any channel (`https://www.youtube.com/feeds/videos.xml?channel_id=:id`).
- **Reddit**: Track subreddits (`https://www.reddit.com/r/:subreddit/.rss`).
- **Cloudflare Blog**: Official updates from Cloudflare engineering.

---

## 🔒 Deduplication & Delivery Guarantee

- **Primary SQLite Deduplication**: Every delivered item is indexed in SQLite (`sent_entries`). A feed entry will never be posted twice to the same webhook.
- **Distributed Redis Coordination**: In multi-instance deployments, instances share deduplication keys and distributed polling locks in Redis (`drss:sent:<feedId>`), preventing duplicate deliveries across separate containers.
- **Rate-Limit Backoff**: If Discord returns an HTTP `429 Too Many Requests`, deliveries pause according to the `Retry-After` header.
