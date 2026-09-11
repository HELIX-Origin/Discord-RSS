# Feed Watcher Agent

This agent defines architecture, workflow conventions, and execution references for the Discord RSS feed polling and scraping subsystem.

## Architecture

```mermaid
flowchart TD
    Scheduler[Interval Scheduler] --> Loop[Enumerate Active Feeds]
    Loop --> Lock{Acquire Poll Lock}
    Lock -->|Single / Redis Lock| Fetch[fetchRaw Target URL]
    Fetch --> Challenge{Anti-Bot Challenge?}
    Challenge -->|Yes| WarnSkip[Log Warning & Skip Poll]
    Challenge -->|No| ParserType{Feed Type?}
    ParserType -->|Standard XML| ParseXML[parseFeed: RSS / Atom]
    ParserType -->|Scrape Feed| ParseHTML[scrapeItems: CSS Selectors]
    ParseXML --> Dedupe{AppState.isEntrySent}
    ParseHTML --> Dedupe
    Dedupe -->|New Item| Embed[Build Discord Embed]
    Dedupe -->|Already Sent| SkipEntry[Ignore Item]
    Embed --> Dispatch[POST Direct to Discord Channel]
    Dispatch --> MarkSent[AppState.markEntrySent + SQLite]
```

## Key Responsibilities

1. **Scheduled Polling**:
   - Enumerate all enabled feeds from `repo.listFeedsForAllUsers()`.
   - Acquire distributed locks via `RedisCoordinator` if Redis is enabled, preventing cross-instance duplicate sends.
   - Fetch remote content via `fetchRaw` with configured timeout and byte limits.
2. **Challenge & Error Handling**:
   - Gracefully detect Cloudflare or anti-bot challenges (`isCloudflareChallenge`) and skip polling cycle without crashing.
3. **Deduplication**:
   - In-memory GUID deduplication with SQLite write-through caching.
4. **Channel Delivery**:
   - Format rich Discord embeds (`feedEmbed`) and dispatch directly to the target Discord channel.

## Environment Configuration

| Variable | Description | Default |
|---|---|---|
| `POLL_INTERVAL_MS` | Milliseconds between feed polling cycles | `60000` |
| `REQUEST_TIMEOUT_MS` | HTTP fetch request timeout | `15000` |
| `REDIS_PORT` / `REDIS_URL` | Optional Redis coordinator for multi-instance deployments | `3535` |

## Commands
```bash
npm run build
npm test
```