# 🤖 Reddit Feeds & Pure Image Mode

HELIX RSS offers a dedicated Reddit engine optimized for subreddit syndication, visual media extraction, and formatting. It supports both **Pure Image Mode** and **Standard RSS Mode**.

---

## 🎨 Pure Image Mode vs. Standard RSS Mode

Reddit feeds can be configured in one of two display modes:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Pure Image Mode (feedType: 'reddit')                     │
├─────────────────────────────────────────────────────────────┤
│ Ideal for: r/wallpapers, r/memes, r/aww, r/Art, r/earthporn │
│ Behavior:                                                   │
│ • Strips out lengthy markdown text and submission boilerplate│
│ • Extracts full-resolution image/gallery/gifv media        │
│ • Displays the title and high-resolution banner image       │
│ • Compact footer with subreddit link & author               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. Standard RSS Mode (feedType: 'rss')                      │
├─────────────────────────────────────────────────────────────┤
│ Ideal for: r/technology, r/AskReddit, r/worldnews, r/gaming │
│ Behavior:                                                   │
│ • Preserves textual self-post content & excerpt preview     │
│ • Displays rich thumbnail card and discussion thread stats  │
│ • Full article embed formatting                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖼️ Media Extraction & GIF Handling

Reddit media syndication handles multiple media hosts and formats:
1. **Reddit Image Hosting (`i.redd.it`)**: Resolves original uncompressed resolution.
2. **Reddit Galleries (`reddit.com/gallery/...`)**: Automatically extracts the primary high-res slide.
3. **Imgur & Gfycat**: Resolves static previews and animated GIF equivalents (`.gifv` -> `.gif`).
4. **Reddit Video Previews (`v.redd.it`)**: Extracts the high-definition poster image and direct video preview URL.
5. **Thumbnails Fallback**: If an image is missing or blocked, the engine attempts to fall back to the Reddit preview thumbnail.

---

## 🔍 Subreddit Sorting & Filters

When subscribing to a subreddit, you can specify sort orders and filters:

| Syntax Example | Description |
| :--- | :--- |
| `r/technology` | Default hot posts feed |
| `r/wallpapers/top?t=day` | Top posts of the current day |
| `r/memes/top?t=week` | Top posts of the week |
| `r/news/new` | Real-time newest submissions |
| `r/aww+cats` | Multi-subreddit combination feed |

---

## 🔄 Toggling Feed Mode

You can toggle an existing Reddit feed between **Pure Image Mode** and **Standard RSS Mode** at any time without recreating the subscription.

### Via Web Dashboard
1. Navigate to the **Reddit Feeds** tab.
2. Locate the feed card.
3. Use the **Mode Switcher** toggle (`Pure Image` vs `RSS Article`).
4. Changes take effect on the next polling cycle.

### Via REST API
```http
PATCH /api/feeds/123
Content-Type: application/json

{
  "feedType": "reddit"
}
```
*(Set `"feedType": "rss"` to switch back to Standard RSS Mode).*

---

## 🛡️ Preventing Reddit Rate Limiting (429 Errors)

Reddit enforces rate limits on RSS and XML queries based on the HTTP `User-Agent`.

### Best Practices:
1. Set a unique, descriptive User-Agent in `.env` (`USER_AGENT`):
   ```env
   USER_AGENT="HelixRSS/0.1.0 (by /u/YourRedditUsername; contact: admin@yourdomain.com)"
   ```
2. Avoid short delivery intervals for high-volume Reddit subscriptions — use the dashboard's 10–60 minute posting options.
3. If you run multiple subreddits, combine them using the multi-reddit format (e.g., `r/tech+gadgets+hardware`) rather than 3 separate feeds.
