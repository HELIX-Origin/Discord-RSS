# 🔌 REST API Reference

The HELIX RSS dashboard exposes a JSON REST API for managing feeds, presets, server settings, diagnostics, and triggering manual operations.

---

## 🔐 Authentication & Headers

Requests made through the web dashboard automatically pass the active Discord OAuth2 session cookie. For external API integrations or scripts, pass the session cookie or authorized token header:

```http
Content-Type: application/json
Accept: application/json
```

---

## 📡 Feeds Endpoints

### 1. List All Feeds
```http
GET /api/feeds
```
**Query Parameters**:
- `guildId` (optional): Filter feeds for a specific Discord server.
- `type` (optional): Filter by feed type (`rss`, `reddit`, `freegames`, `youtube`, `tiktok`, `bluesky`).

**Response**:
```json
[
  {
    "id": 1,
    "guildId": "123456789012345678",
    "channelId": "987654321098765432",
    "name": "Ars Technica",
    "url": "https://feeds.arstechnica.com/arstechnica/index",
    "feedType": "rss",
    "roleId": null,
    "color": "#FF5500",
    "enabled": true,
    "lastPolledAt": "2026-09-11T20:30:00Z",
    "createdAt": "2026-09-01T12:00:00Z"
  }
]
```

---

### 2. Create Feed Subscription
```http
POST /api/feeds
```
**Request Body**:
```json
{
  "guildId": "123456789012345678",
  "channelId": "987654321098765432",
  "name": "r/wallpapers",
  "url": "https://www.reddit.com/r/wallpapers/hot.rss",
  "feedType": "reddit",
  "roleId": "112233445566778899",
  "color": "#5865F2",
  "enabled": true
}
```
**Response**: `201 Created` with created feed object.

---

### 3. Update Feed
```http
PATCH /api/feeds/:id
```
**Request Body**:
```json
{
  "name": "r/wallpapers (Pure Image)",
  "feedType": "reddit",
  "color": "#00FFCC",
  "enabled": true
}
```
**Response**: `200 OK` with updated feed object.

---

### 4. Delete Feed
```http
DELETE /api/feeds/:id
```
**Response**:
```json
{
  "success": true,
  "message": "Feed deleted successfully"
}
```

---

### 5. Send Test Feed Embed
Dispatches a sample embed from the feed directly to the assigned Discord channel.
```http
POST /api/feeds/:id/test
```
**Response**:
```json
{
  "success": true,
  "message": "Test notification dispatched to channel"
}
```

---

### 6. Trigger Free Games Poll
Forces an immediate on-demand scan of all configured Free Games platforms.
```http
POST /api/feeds/freegames/poll
```
**Response**:
```json
{
  "success": true,
  "message": "Free games poll triggered successfully",
  "dealsFound": 5,
  "newDealsDispatched": 1
}
```

---

## 📚 News Feeds Presets Catalog

### 1. Fetch Verified Presets
```http
GET /api/presets
```
**Response**:
```json
{
  "categories": [
    "Technology",
    "Gaming",
    "AI",
    "Science",
    "Cybersecurity",
    "Hardware",
    "Linux",
    "Anime",
    "World News",
    "Space",
    "Entertainment",
    "Finance",
    "Development",
    "Design",
    "Crypto"
  ],
  "presets": [
    {
      "id": "tech-ars",
      "name": "Ars Technica",
      "url": "https://feeds.arstechnica.com/arstechnica/index",
      "category": "Technology",
      "description": "Original tech reporting, reviews, and analysis",
      "icon": "https://cdn.icon.url/ars.png"
    }
  ]
}
```

---

## 🏰 Guilds & Channels Endpoints

### 1. List User's Managed Guilds
```http
GET /api/guilds
```

### 2. List Text Channels for a Guild
```http
GET /api/guilds/:guildId/channels
```
**Response**:
```json
[
  {
    "id": "987654321098765432",
    "name": "news-feed",
    "type": 0,
    "position": 3
  }
]
```

### 3. List Mentionable Roles for a Guild
```http
GET /api/guilds/:guildId/roles
```
**Response**:
```json
[
  {
    "id": "112233445566778899",
    "name": "Tech News Alerts",
    "color": "#00FFAA"
  }
]
```

### 4. Get Forum Thread Delivery Config for Managed Guilds
```http
GET /api/discord/thread-config
```
**Auth**: Any logged-in dashboard user (only guilds they can manage are included).
**Response**:
```json
[
  {
    "guildId": "987654321098765432",
    "name": "My Server",
    "threadsEnabled": true,
    "forumChannelIds": ["111111111111111111"],
    "forumChannels": [{ "id": "111111111111111111", "name": "feed-threads", "type": 15 }]
  }
]
```

### 5. Update Forum Thread Delivery Config for a Guild
```http
PUT /api/discord/thread-config
Content-Type: application/json

{
  "guildId": "987654321098765432",
  "threadsEnabled": true,
  "forumChannelIds": ["111111111111111111"]
}
```
**Auth**: User must have `Manage Channels` (or Administrator) on the target guild.
**Validation**: `threadsEnabled` boolean; `forumChannelIds` must all be IDs of **forum (type 15)** channels present in the guild.
**Response**: the updated guild config object.

---

## 📊 Analytics & Diagnostics

### 1. System Statistics
```http
GET /api/stats
```
**Response**:
```json
{
  "totalFeeds": 42,
  "activeGuilds": 12,
  "totalArticlesDelivered": 15820,
  "uptimeSeconds": 864000,
  "memoryUsageMB": 85.4
}
```

### 2. Live Activity Logs
```http
GET /api/logs?limit=50
```
**Response**:
```json
[
  {
    "timestamp": "2026-09-11T20:38:12.100Z",
    "level": "info",
    "message": "Polled [Ars Technica] — 2 new items dispatched to channel 987654321098765432"
  }
]
```
