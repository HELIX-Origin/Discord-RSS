#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from typing import Any, Iterable

try:
    import certifi
except ImportError:  # pragma: no cover - certifi is installed in the workflow runtime
    certifi = None

try:
    from defusedxml import ElementTree as ET
except ImportError:  # pragma: no cover - workflow installs defusedxml for production use
    import xml.etree.ElementTree as ET

DEFAULT_EXCLUDED_SUBSTRINGS = (
    "/admin",
    "/moderator",
    "/staff",
    "/mod/",
    "admin.php",
    "moderator.php",
    "staff.php",
    "mod.php",
    "controlpanel",
    "manage.php",
)
DEFAULT_ALLOWED_HOSTS = ("example.com",)
CLOUDFLARE_CHALLENGE_MARKERS = (
    "cloudflare",
    "cf-challenge",
    "cf-turnstile",
    "jschl",
    "checking your browser",
    "why am i seeing this",
    "just a moment",
    "verify you are human",
    "ray id",
    "captcha",
    "managed challenge",
    "challenge-platform",
    "please enable javascript",
    "attention required",
    "ddos protection",
)
COMMON_FEED_PATHS = (
    "rss.xml",
    "atom.xml",
    "feed.xml",
    "index.rss",
    "index.atom",
    "feed",
    "rss",
    "forums/index.rss",
    "forums/index.atom",
    "forum-rss.xml",
    "forum-atom.xml",
)


@dataclass(frozen=True)
class Entry:
    entry_id: str
    title: str
    link: str
    published: str
    summary: str
    author: str


def load_feed_urls_from_env() -> list[str]:
    urls: list[str] = []
    import re
    for key, value in os.environ.items():
        match = re.match(r"([A-Z0-9_]+)_RSS_URL_(\d{3})", key)
        if match:
            source = match.group(1)
            index = int(match.group(2))
            # Ensure sequential loading by collecting all and sorting by index
            urls.append((index, value))
    urls.sort(key=lambda x: x[0])
    return [url for _, url in urls]


def main() -> int:
    site_url = require_env("SITE_URL")
    feed_urls = load_feed_urls_from_env()
    if not feed_urls:
        feed_urls = discover_feed_urls([site_url])
    if not feed_urls:
        raise SystemExit("No RSS/Atom feed URLs discovered on the configured site.")

    webhook_urls = load_webhook_urls("DISCOHOOK")
    if not webhook_urls:
        webhook_urls = load_webhook_urls("DISCORD")
    if not webhook_urls:
        webhook_urls = load_webhook_urls("SITE STATUS")
    if not webhook_urls:
        raise SystemExit(
            "No webhook URLs found. Configure GitHub Secrets using the pattern "
            "{SERVICE_NAME}_WEBHOOK_URL_{###} (e.g., DISCOHOOK_WEBHOOK_URL_001, DISCORD_WEBHOOK_URL_001). "
            "Note: Discohook bot must be invited to the server for primary webhook use."
        )
    webhook_url = webhook_urls[0]
    state_path = Path(os.getenv("STATE_FILE", ".cache/feed-state.json"))
    max_posts = min(5, max(1, int(os.getenv("MAX_POSTS", "5"))))
    excluded_substrings = tuple(
        part.strip()
        for part in os.getenv(
            "EXCLUDED_URL_SUBSTRINGS",
            ",".join(default_excluded_substrings(site_url)),
        ).split(",")
        if part.strip()
    )
    allowed_hosts = tuple(
        part.strip().lower()
        for part in os.getenv("ALLOWED_HOSTS", ",".join(default_allowed_hosts(site_url))).split(",")
        if part.strip()
    )

    entries: list[Entry] = []
    for feed_url in feed_urls:
        entries.extend(fetch_entries(feed_url))
    entries = deduplicate_entries(entries)
    visible_entries = [entry for entry in entries if is_allowed(entry, allowed_hosts) and not is_excluded(entry, excluded_substrings)]
    if not visible_entries:
        print("No visible feed entries found.")
        return 0

    previous_state = load_state(state_path)
    latest_entry_id = visible_entries[0].entry_id

    if not previous_state:
        save_state(state_path, {"last_entry_id": latest_entry_id})
        print("Initialized state without posting historical entries.")
        return 0

    entries_to_post = select_entries_to_post(visible_entries, previous_state.get("last_entry_id"), max_posts)
    last_successful_entry_id = previous_state.get("last_entry_id", latest_entry_id)

    for entry in entries_to_post:
        for url in webhook_urls:
            try:
                post_to_discord(url, entry, site_url)
            except urllib.error.URLError as exc:
                save_state(state_path, {"last_entry_id": last_successful_entry_id})
                raise SystemExit(f"Failed to post to Discord webhook ({url}): {exc}") from exc
        last_successful_entry_id = entry.entry_id

    if entries_to_post:
        save_state(state_path, {"last_entry_id": last_successful_entry_id})
    print(f"Posted {len(entries_to_post)} entries.")
    return 0


def load_webhook_urls(service_name: str) -> list[str]:
    urls: list[str] = []
    index = 1
    while True:
        secret_name = f"{service_name.upper()}_WEBHOOK_URL_{index:03d}"
        url = os.getenv(secret_name)
        if not url:
            break
        urls.append(url)
        index += 1
    return urls


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def load_feed_urls(source_name: str) -> list[str]:
    urls: list[str] = []
    index = 1
    while True:
        secret_name = f"{source_name.upper()}_RSS_URL_{index:03d}"
        url = os.getenv(secret_name)
        if not url:
            break
        urls.append(url)
        index += 1
    return urls


def parse_feed_urls(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.replace("\n", ",").split(",") if part.strip()]


def normalize_site_url(site_url: str | None) -> str:
    value = (site_url or os.getenv("SITE_URL") or "").strip()
    if not value:
        return "https://example.com"
    return value if "://" in value else f"https://{value}"


def site_host(site_url: str | None) -> str:
    normalized = normalize_site_url(site_url)
    parsed = urllib.parse.urlparse(normalized)
    hostname = parsed.hostname or parsed.netloc or normalized
    return hostname.split(":", 1)[0].lower().rstrip("/")


def site_name(site_url: str | None) -> str:
    host = site_host(site_url)
    if not host:
        return "Site"
    labels = [part for part in host.split(".") if part]
    if len(labels) >= 2:
        primary = labels[-2]
    else:
        primary = labels[0]
    return primary.replace("-", " ").replace("_", " ").title()


def default_allowed_hosts(site_url: str | None = None) -> tuple[str, ...]:
    host = site_host(site_url)
    return (host,) if host else DEFAULT_ALLOWED_HOSTS


def default_excluded_substrings(_site_url: str | None = None) -> tuple[str, ...]:
    return DEFAULT_EXCLUDED_SUBSTRINGS


def discover_feed_urls(site_urls: Iterable[str] | None = None) -> list[str]:
    candidates = [
        candidate.strip()
        for candidate in (site_urls or (normalize_site_url(os.getenv("SITE_URL") or "https://example.com"),))
        if candidate and candidate.strip()
    ]
    discovered: set[str] = set()

    for site_url in candidates:
        site_discovered: set[str] = set()
        try:
            html = fetch_via_http(site_url).decode("utf-8", errors="ignore")
        except SystemExit:
            continue

        for match in re.findall(
            r'''<link[^>]+(?:rel=["']alternate["']|type=["'][^"']*(?:rss|atom)[^"']*["'])[^>]+href=["']([^"']+)["']|href=["']([^"']*(?:rss|atom)[^"']*)["']''',
            html,
            flags=re.IGNORECASE,
        ):
            for href in match:
                if href:
                    url = urllib.parse.urljoin(site_url, href)
                    site_discovered.add(url)

        if not site_discovered:
            for path in COMMON_FEED_PATHS:
                url = urllib.parse.urljoin(site_url, path)
                site_discovered.add(url)

        discovered.update(site_discovered)

    if discovered:
        return sorted(discovered)
    return []


def deduplicate_entries(entries: list[Entry]) -> list[Entry]:
    seen: set[str] = set()
    deduplicated: list[Entry] = []
    for entry in entries:
        key = entry.entry_id or entry.link or entry.title
        if key in seen:
            continue
        seen.add(key)
        deduplicated.append(entry)
    return deduplicated


def browser_headers() -> dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "DNT": "1",
        "Connection": "keep-alive",
    }


def looks_like_cloudflare_challenge(content: bytes | str) -> bool:
    source = (content.decode("utf-8", errors="ignore") if isinstance(content, bytes) else content).lower()
    if not source:
        return False
    return any(marker in source for marker in CLOUDFLARE_CHALLENGE_MARKERS)


def build_ssl_opener() -> urllib.request.OpenerDirector:
    ssl_context = ssl.create_default_context(cafile=certifi.where()) if certifi is not None else ssl.create_default_context()
    return urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ssl_context),
        urllib.request.HTTPCookieProcessor(),
    )


def fetch_via_http(feed_url: str) -> bytes:
    request = urllib.request.Request(feed_url, headers=browser_headers())
    opener = build_ssl_opener()
    try:
        with opener.open(request, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        if exc.code in {403, 429} and looks_like_cloudflare_challenge(exc.read()):
            return fetch_via_browser(feed_url)
        raise SystemExit(f"Failed to download feed: {exc}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Failed to download feed: {exc}") from exc


def fetch_via_external_api(feed_url: str) -> bytes | None:
    api_key = os.getenv("CLOUDFLARE_API_KEY")
    solver_url = os.getenv("CHALLENGE_SOLVER_URL")
    if not api_key or not solver_url:
        return None
    try:
        payload = json.dumps({"url": feed_url, "api_key": api_key}).encode("utf-8")
        request = urllib.request.Request(
            solver_url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": browser_headers()["User-Agent"]},
            method="POST",
        )
        with build_ssl_opener().open(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            html = result.get("html") or result.get("content") or result.get("response")
            if html:
                return html.encode("utf-8") if isinstance(html, str) else html
    except Exception:
        pass
    return None


def fetch_via_browser(feed_url: str) -> bytes:
    external_content = fetch_via_external_api(feed_url)
    if external_content is not None:
        return external_content

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit(
            "The target site is behind a Cloudflare browser challenge and cannot be resolved. "
            "Configure an external challenge-solving API (CLOUDFLARE_API_KEY + CHALLENGE_SOLVER_URL) "
            "in GitHub Secrets, or install Playwright."
        ) from exc

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(user_agent=browser_headers()["User-Agent"])
        try:
            page.goto(feed_url, wait_until="domcontentloaded", timeout=60000)
            for _ in range(12):
                html = page.content()
                if not looks_like_cloudflare_challenge(html):
                    return html.encode("utf-8")
                page.wait_for_timeout(5000)
        finally:
            browser.close()

    raise SystemExit(
        "The target site is still presenting a Cloudflare challenge after a browser-based retry. "
        "The feed URL may require a different source or a site-specific pass-through step."
    )


def fetch_entries(feed_url: str) -> list[Entry]:
    content = fetch_via_http(feed_url)
    if looks_like_cloudflare_challenge(content):
        content = fetch_via_browser(feed_url)

    root = ET.fromstring(content)
    if root.tag.endswith("rss"):
        return parse_rss(root)
    if root.tag.endswith("feed"):
        return parse_atom(root)
    raise SystemExit(f"Unsupported feed format: {root.tag}")


def parse_rss(root: ET.Element) -> list[Entry]:
    channel = root.find("channel")
    if channel is None:
        return []

    entries: list[Entry] = []
    for item in channel.findall("item"):
        title = text_or_default(item.findtext("title"), "Untitled post")
        link = text_or_default(item.findtext("link"), "")
        guid = text_or_default(item.findtext("guid"), link or title)
        published = text_or_default(item.findtext("pubDate"), "")
        summary = clean_summary(item.findtext("description"))
        author = text_or_default(item.findtext("author"), item.findtext("{http://purl.org/dc/elements/1.1/}creator") or "")
        entries.append(Entry(guid, title, link, published, summary, author))
    return entries


def parse_atom(root: ET.Element) -> list[Entry]:
    namespace = {"atom": "http://www.w3.org/2005/Atom"}
    entries: list[Entry] = []

    for item in root.findall("atom:entry", namespace):
        title = text_or_default(item.findtext("atom:title", default="", namespaces=namespace), "Untitled post")
        entry_id = text_or_default(item.findtext("atom:id", default="", namespaces=namespace), title)
        published = text_or_default(item.findtext("atom:updated", default="", namespaces=namespace), "")
        summary = clean_summary(
            item.findtext("atom:summary", default="", namespaces=namespace)
            or item.findtext("atom:content", default="", namespaces=namespace)
        )
        author = text_or_default(item.findtext("atom:author/atom:name", default="", namespaces=namespace), "")

        link = ""
        for link_element in item.findall("atom:link", namespace):
            if link_element.attrib.get("rel", "alternate") == "alternate":
                link = link_element.attrib.get("href", "")
                break

        entries.append(Entry(entry_id or link or title, title, link, published, summary, author))
    return entries


def text_or_default(value: str | None, default: str) -> str:
    value = (value or "").strip()
    return value or default


def clean_summary(value: str | None) -> str:
    summary = unescape((value or "").strip())
    return " ".join(summary.split())


def is_excluded(entry: Entry, excluded_substrings: Iterable[str]) -> bool:
    haystacks = (entry.link, entry.entry_id)
    return any(substring in haystacks_value for substring in excluded_substrings for haystacks_value in haystacks)


def is_allowed(entry: Entry, allowed_hosts: Iterable[str]) -> bool:
    for candidate in (entry.link, entry.entry_id):
        parsed = urllib.parse.urlparse(candidate)
        if parsed.scheme in {"http", "https"} and (parsed.hostname or "").lower() in allowed_hosts:
            return True
    return False


def select_entries_to_post(entries: list[Entry], last_entry_id: str | None, max_posts: int) -> list[Entry]:
    if not last_entry_id:
        return []

    max_posts = min(5, max(1, max_posts))
    pending: list[Entry] = []
    for entry in entries:
        if entry.entry_id == last_entry_id:
            break
        pending.append(entry)

    pending.reverse()
    if len(pending) > max_posts:
        pending = pending[:max_posts]
    return pending


def load_state(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(path: Path, state: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(str(tmp_path), str(path))


def get_site_status(site_url: str) -> bool:
    try:
        content = fetch_via_http(site_url)
    except SystemExit:
        return False

    if not content:
        return False
    if looks_like_cloudflare_challenge(content):
        return False
    return True


def main_site_status() -> int:
    site_url = require_env("SITE_URL")
    webhook_urls = load_webhook_urls("DISCOHOOK")
    if not webhook_urls:
        webhook_urls = load_webhook_urls("SITE STATUS")
    if not webhook_urls:
        webhook_urls = load_webhook_urls("DISCORD")
    if not webhook_urls:
        raise SystemExit(
            "No webhook URLs found. Configure GitHub Secrets using the pattern "
            "{SERVICE_NAME}_WEBHOOK_URL_{###} (e.g., DISCOHOOK_WEBHOOK_URL_001, SITE_STATUS_WEBHOOK_URL_001). "
            "Note: Discohook bot must be invited to the server for primary webhook use."
        )
    webhook_url = webhook_urls[0]
    state_path = Path(os.getenv("SITE_STATUS_STATE_FILE", ".cache/site-status-state.json"))
    current_status = "up" if get_site_status(site_url) else "down"
    previous_state = load_state(state_path)

    if not previous_state:
        save_state(state_path, {"status": current_status})
        print(f"Initialized site status to {current_status} without sending an alert.")
        return 0

    previous_status = previous_state.get("status")
    if previous_status == current_status:
        print(f"Site status unchanged: {current_status}")
        return 0

    for url in webhook_urls:
        try:
            post_site_status(url, current_status, site_url)
        except urllib.error.URLError as exc:
            raise SystemExit(f"Failed to post status to webhook ({url}): {exc}") from exc
    save_state(state_path, {"status": current_status})
    print(f"Site status changed to {current_status}; alert sent.")
    return 0


def post_site_status(webhook_url: str, status: str, site_url: str) -> None:
    message = build_site_status_message(status, site_url)
    payload = json.dumps(remove_nones(message)).encode("utf-8")
    request = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with build_ssl_opener().open(request, timeout=30):
        pass


def post_to_discord(webhook_url: str, entry: Entry, site_url: str | None = None) -> None:
    message = build_discord_message(entry, site_url)

    payload = json.dumps(remove_nones(message)).encode("utf-8")
    request = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with build_ssl_opener().open(request, timeout=30):
        pass


def remove_nones(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: remove_nones(inner) for key, inner in value.items() if inner is not None}
    if isinstance(value, list):
        return [remove_nones(inner) for inner in value if inner is not None]
    return value


def build_discord_message(entry: Entry, site_url: str | None = None) -> dict[str, Any]:
    site_name_value = site_name(site_url)
    forum_link = truncate_field_value(f"[Open post]({entry.link})") if entry.link else None
    normalized_timestamp = normalize_timestamp(entry.published)
    published_value = truncate_field_value(normalized_timestamp or entry.published) if entry.published else None
    embed = {
        "title": entry.title[:256],
        "url": entry.link or None,
        "description": entry.summary[:4096] or f"New forum post on {site_name_value}.",
        "color": 0x5865F2,
        "author": {"name": entry.author[:256]} if entry.author else {"name": site_name_value},
        "fields": [
            {"name": "Post", "value": forum_link, "inline": False}
        ]
        if forum_link
        else [],
        "footer": {"text": f"{site_name_value} Feed"},
        "timestamp": normalized_timestamp,
    }
    if published_value:
        embed["fields"].append({"name": "Published", "value": published_value, "inline": True})
    return {"embeds": [embed], "allowed_mentions": {"parse": []}}


def build_site_status_message(status: str, site_url: str | None = None) -> dict[str, Any]:
    site_name_value = site_name(site_url)
    if status == "up":
        title = f"{site_name_value} is online"
        description = "The site has recovered and is responding again."
        color = 0x57F287
    else:
        title = f"{site_name_value} is offline"
        description = "The site is not responding or is behind a challenge page."
        color = 0xED4245

    return {
        "embeds": [
            {
                "title": title,
                "url": normalize_site_url(site_url),
                "description": description,
                "color": color,
                "fields": [{"name": "Status", "value": status.upper(), "inline": True}],
                "footer": {"text": f"{site_name_value} Status"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
        "allowed_mentions": {"parse": []},
    }


def normalize_timestamp(value: str) -> str | None:
    if not value:
        return None

    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, IndexError, OverflowError):
        pass

    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return parsed.isoformat()


def truncate_field_value(value: str) -> str:
    return value[:1024]


if __name__ == "__main__":
    sys.exit(main())
