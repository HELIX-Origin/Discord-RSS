# RSS & Atom Feed Skill

## Feed Formats
- **RSS 2.0**: `<rss>` root, `<channel>` container, `<item>` entries with `<title>`, `<link>`, `<pubDate>`, `<guid>`.
- **Atom**: `<feed>` root with `<entry>` elements using `<title>`, `<link href="..."/>`, `<updated>`, `<id>`.

## Parsing Strategy (`src/feed/parser.ts`)
- Parse fetched text with the native XML parser in `src/feed/xml.ts`; extract entries as `FeedEntry[]` (`{ title, link, description, publishedAt, author }`).
- `withGuid(...)` derives a stable GUID per entry (handles duplicate/no-guid entries).
- `stripHtml(...)` cleans descriptions for embed body text.
- Decode robustly: try UTF-8 first, fall back to `latin1` rather than crashing (see `BUG-002`).

## Feed Sources (User-Managed)
- Feed URLs are **user-managed records in SQLite** (`feeds` table), added on the dashboard (Feed Builder or Popular Feeds tab) and via `/api/feeds`.
- They are **NOT** env vars. Env naming like `{SOURCE}_RSS_URL_{###}` and `SITE_URL` no longer applies.
- Feed analysis (auto RSS discovery vs. scrape selector config) lives in `src/feed/builder.ts`.

## Anonymous Feeds & Dedupe
- Feeds without RSS can use the scrape branch (`feedType: 'scrape'`, selectors in `scrape` config) via `src/feed/scraper.ts` + `src/feed/html.ts`.
- Sent-entry dedupe lives in `AppState` (+ optional Redis for cross-instance), keyed by feed id + entry GUID.