# RSS & Atom Feed Skill

## Feed Formats
- **RSS 2.0**: `<rss>` root, `<channel>` container, `<item>` entries with `<title>`, `<link>`, `<pubDate>`, `<guid>`.
- **Atom**: `<feed>` root with `<entry>` elements using `<title>`, `<link href="..."/>`, `<updated>`, `<id>`.

## Parsing Strategy
- Use `xml.etree.ElementTree.parse()` or `fromstring()` on the fetched byte/text content.
- Extract entries as `list[dict]` with standard keys: `title`, `link`, `published`, `author`, `id`.
- Filter out staff/admin paths (`/admin/`, `/mod/`, `/staff/`) by checking `<link>` URL patterns.

## Discovery Pattern
- If `FEED_URL` or `FEED_URLS` secrets exist, use them directly.
- Otherwise, attempt common paths: `/feed`, `/rss`, `/feed.xml`, `/atom.xml` appended to `SITE_URL`.
