# Python Development Skill

## Environment
- Python 3.11 or 3.12 (no external package manager required for core functionality)
- Use `typing` module for hints: `list[dict[str, str]]`, `Optional[str]`
- All feed and status logic uses standard library: `urllib.request`, `json`, `re`, `datetime`, `http.client`

## Project Layout
```
scripts/
  post_feed_to_discord.py
  post_site_status.py
tests/
  test_post_feed_to_discord.py
```

## Key Patterns
- **Safe URL fetching**: `urllib.request.urlopen(url, timeout=10)` with `urllib.error.URLError` handling.
- **JSON state persistence**: `json.load(open(path))` / `json.dump(data, open(path, 'w'), indent=2)`.
- **Encoding resilience**: `.decode('utf-8', errors='replace')` or fallback to `latin-1`.
- **Type safety**: Add `-> None` on functions that modify state; `-> dict` for feed entry parsers.
