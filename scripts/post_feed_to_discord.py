#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html import unescape
from pathlib import Path
from typing import Any, Iterable

DEFAULT_EXCLUDED_SUBSTRINGS = (
    "forumdisplay.php/766-The-Team",
    "forumdisplay.php?766-The-Team",
    "/766-The-Team",
)
DEFAULT_ALLOWED_HOSTS = ("virtualcustoms.net", "www.virtualcustoms.net")


@dataclass(frozen=True)
class Entry:
    entry_id: str
    title: str
    link: str
    published: str
    summary: str


def main() -> int:
    feed_url = require_env("FEED_URL")
    webhook_url = require_env("DISCORD_WEBHOOK_URL")
    state_path = Path(os.getenv("STATE_FILE", ".cache/feed-state.json"))
    max_posts = int(os.getenv("MAX_POSTS", "5"))
    excluded_substrings = tuple(
        part.strip()
        for part in os.getenv("EXCLUDED_URL_SUBSTRINGS", ",".join(DEFAULT_EXCLUDED_SUBSTRINGS)).split(",")
        if part.strip()
    )
    allowed_hosts = tuple(
        part.strip().lower()
        for part in os.getenv("ALLOWED_HOSTS", ",".join(DEFAULT_ALLOWED_HOSTS)).split(",")
        if part.strip()
    )

    entries = fetch_entries(feed_url)
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

    for entry in entries_to_post:
        post_to_discord(webhook_url, entry)

    save_state(state_path, {"last_entry_id": latest_entry_id})
    print(f"Posted {len(entries_to_post)} entries.")
    return 0


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def fetch_entries(feed_url: str) -> list[Entry]:
    request = urllib.request.Request(
        feed_url,
        headers={
            "User-Agent": "VirtualCustomsFeedBot/1.0 (+https://github.com/PhantomNimbi/VirtualCustoms-Feed)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read()
    except urllib.error.URLError as exc:
        raise SystemExit(f"Failed to download feed: {exc}") from exc

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
        entries.append(Entry(guid, title, link, published, summary))
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

        link = ""
        for link_element in item.findall("atom:link", namespace):
            if link_element.attrib.get("rel", "alternate") == "alternate":
                link = link_element.attrib.get("href", "")
                break

        entries.append(Entry(entry_id or link or title, title, link, published, summary))
    return entries


def text_or_default(value: str | None, default: str) -> str:
    value = (value or "").strip()
    return value or default


def clean_summary(value: str | None) -> str:
    summary = unescape((value or "").strip())
    return " ".join(summary.split())


def is_excluded(entry: Entry, excluded_substrings: Iterable[str]) -> bool:
    haystacks = (entry.link, entry.entry_id, entry.summary)
    return any(substring in haystacks_value for substring in excluded_substrings for haystacks_value in haystacks)


def is_allowed(entry: Entry, allowed_hosts: Iterable[str]) -> bool:
    for candidate in (entry.link, entry.entry_id):
        parsed = urllib.parse.urlparse(candidate)
        if parsed.scheme in {"http", "https"} and parsed.netloc.lower() in allowed_hosts:
            return True
    return False


def select_entries_to_post(entries: list[Entry], last_entry_id: str | None, max_posts: int) -> list[Entry]:
    if not last_entry_id:
        return []

    pending: list[Entry] = []
    for entry in entries:
        if entry.entry_id == last_entry_id:
            break
        pending.append(entry)

    pending.reverse()
    if len(pending) > max_posts:
        pending = pending[-max_posts:]
    return pending


def load_state(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(path: Path, state: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")


def post_to_discord(webhook_url: str, entry: Entry) -> None:
    message = {
        "embeds": [
            {
                "title": entry.title[:256],
                "url": entry.link or None,
                "description": entry.summary[:4096] or None,
                "footer": {"text": entry.published[:2048]} if entry.published else None,
            }
        ],
        "allowed_mentions": {"parse": []},
    }

    payload = json.dumps(remove_nones(message)).encode("utf-8")
    request = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30):
            pass
    except urllib.error.URLError as exc:
        raise SystemExit(f"Failed to post to Discord webhook: {exc}") from exc


def remove_nones(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: remove_nones(inner) for key, inner in value.items() if inner is not None}
    if isinstance(value, list):
        return [remove_nones(inner) for inner in value if inner is not None]
    return value


if __name__ == "__main__":
    sys.exit(main())
