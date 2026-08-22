import json
import os
import tempfile
import unittest
from unittest.mock import patch

import scripts.post_feed_to_discord as feed_module
from scripts.post_feed_to_discord import (
    DEFAULT_ALLOWED_HOSTS,
    DEFAULT_EXCLUDED_SUBSTRINGS,
    Entry,
    build_discord_message,
    build_site_status_message,
    deduplicate_entries,
    discover_feed_urls,
    get_site_status,
    is_allowed,
    is_excluded,
    main_site_status,
    parse_feed_urls,
    select_entries_to_post,
)


class PostFeedToDiscordTests(unittest.TestCase):
    def test_excludes_team_forum_entries(self):
        entry = Entry(
            entry_id="https://virtualcustoms.net/forumdisplay.php/766-The-Team",
            title="Internal",
            link="https://virtualcustoms.net/forumdisplay.php/766-The-Team",
            published="",
            summary="",
            author="",
        )

        self.assertTrue(is_excluded(entry, DEFAULT_EXCLUDED_SUBSTRINGS))

    def test_only_allows_virtualcustoms_domain_entries(self):
        allowed_entry = Entry(
            entry_id="https://virtualcustoms.net/showthread.php/123-visible",
            title="Visible",
            link="https://virtualcustoms.net/showthread.php/123-visible",
            published="",
            summary="",
            author="",
        )
        blocked_entry = Entry(
            entry_id="https://example.com/offsite",
            title="Blocked",
            link="https://example.com/offsite",
            published="",
            summary="",
            author="",
        )

        self.assertTrue(is_allowed(allowed_entry, DEFAULT_ALLOWED_HOSTS))
        self.assertFalse(is_allowed(blocked_entry, DEFAULT_ALLOWED_HOSTS))

    def test_domain_and_exclusion_filters_work_together(self):
        entries = [
            Entry(
                "https://virtualcustoms.net/showthread.php/123-visible",
                "Visible",
                "https://virtualcustoms.net/showthread.php/123-visible",
                "",
                "",
                "",
            ),
            Entry(
                "https://virtualcustoms.net/forumdisplay.php/766-The-Team",
                "Excluded",
                "https://virtualcustoms.net/forumdisplay.php/766-The-Team",
                "",
                "",
                "",
            ),
            Entry(
                "https://example.com/offsite",
                "Offsite",
                "https://example.com/offsite",
                "",
                "",
                "",
            ),
        ]

        visible_entries = [
            entry
            for entry in entries
            if is_allowed(entry, DEFAULT_ALLOWED_HOSTS) and not is_excluded(entry, DEFAULT_EXCLUDED_SUBSTRINGS)
        ]

        self.assertEqual(
            ["https://virtualcustoms.net/showthread.php/123-visible"],
            [entry.entry_id for entry in visible_entries],
        )

    def test_supports_multiple_feed_sources(self):
        urls = parse_feed_urls("https://site.example/feed-one.xml, https://site.example/feed-two.xml\nhttps://site.example/feed-three.xml")
        self.assertEqual(
            [
                "https://site.example/feed-one.xml",
                "https://site.example/feed-two.xml",
                "https://site.example/feed-three.xml",
            ],
            urls,
        )

        entries = [
            Entry("a", "Alpha", "https://example.com/a", "", "", ""),
            Entry("b", "Bravo", "https://example.com/b", "", "", ""),
            Entry("a", "Alpha duplicate", "https://example.com/a", "", "", ""),
        ]

        self.assertEqual(["a", "b"], [entry.entry_id for entry in deduplicate_entries(entries)])

    @patch.object(feed_module, "fetch_via_http", return_value=b'''<html><head>
        <link rel="alternate" type="application/rss+xml" href="/forums/index.rss">
        <link rel="alternate" type="application/atom+xml" href="https://example.com/updates.atom">
        <a href="https://example.com/not-a-feed.xml">Other link</a>
    </head></html>''')
    def test_discovers_site_feed_urls_from_html(self, _):
        urls = discover_feed_urls(["https://example.com/forum/index.php"])

        self.assertEqual(["https://example.com/forums/index.rss", "https://example.com/updates.atom"], urls)

    @patch.object(feed_module, "fetch_via_http", return_value=b"<html><body>No RSS links here</body></html>")
    def test_falls_back_to_common_feed_paths_when_no_feed_links_are_present(self, _):
        urls = discover_feed_urls(["https://example.com/forum/index.php"])

        self.assertIn("https://example.com/forum/index.rss", urls)
        self.assertIn("https://example.com/forum/rss.xml", urls)

    def test_posts_entries_after_last_seen_in_oldest_first_order(self):
        entries = [
            Entry("3", "Newest", "https://example.com/3", "", "", ""),
            Entry("2", "Middle", "https://example.com/2", "", "", ""),
            Entry("1", "Oldest", "https://example.com/1", "", "", ""),
        ]

        pending = select_entries_to_post(entries, "1", 5)

        self.assertEqual(["2", "3"], [entry.entry_id for entry in pending])

    def test_limits_burst_size(self):
        entries = [
            Entry("5", "Five", "https://example.com/5", "", "", ""),
            Entry("4", "Four", "https://example.com/4", "", "", ""),
            Entry("3", "Three", "https://example.com/3", "", "", ""),
            Entry("2", "Two", "https://example.com/2", "", "", ""),
            Entry("1", "One", "https://example.com/1", "", "", ""),
        ]

        pending = select_entries_to_post(entries, "1", 2)

        self.assertEqual(["2", "3"], [entry.entry_id for entry in pending])

    def test_caps_pending_posts_at_five(self):
        entries = [
            Entry(str(index), f"Post {index}", f"https://example.com/{index}", "", "", "")
            for index in range(10, 0, -1)
        ]

        pending = select_entries_to_post(entries, "1", 99)

        self.assertEqual(5, len(pending))
        self.assertEqual(["2", "3", "4", "5", "6"], [entry.entry_id for entry in pending])

    def test_builds_rich_embed_payload(self):
        entry = Entry(
            "https://virtualcustoms.net/showthread.php/123-visible",
            "Visible",
            "https://virtualcustoms.net/showthread.php/123-visible",
            "Sat, 22 Aug 2026 23:00:00 GMT",
            "Hello world",
            "Forum Author",
        )

        payload = build_discord_message(entry)
        embed = payload["embeds"][0]

        self.assertEqual("Visible", embed["title"])
        self.assertEqual("Forum Author", embed["author"]["name"])
        self.assertEqual("Virtual Customs Feed", embed["footer"]["text"])
        self.assertTrue(embed["timestamp"].startswith("2026-08-22T23:00:00"))
        self.assertEqual("[Open post](https://virtualcustoms.net/showthread.php/123-visible)", embed["fields"][0]["value"])

    def test_supports_generic_site_names_and_site_url_overrides(self):
        entry = Entry(
            "https://example.com/thread/123-visible",
            "Visible",
            "https://example.com/thread/123-visible",
            "",
            "",
            "",
        )

        status_message = build_site_status_message("down", "https://example.com")
        self.assertEqual("Example is offline", status_message["embeds"][0]["title"])
        self.assertEqual("Example Status", status_message["embeds"][0]["footer"]["text"])

        payload = build_discord_message(entry, "https://example.com")
        self.assertEqual("Example Feed", payload["embeds"][0]["footer"]["text"])
        self.assertEqual("Example", payload["embeds"][0]["author"]["name"])
        self.assertEqual("New forum post on Example.", payload["embeds"][0]["description"])

    def test_site_status_uses_separate_discord_webhook_and_change_tracking(self):
        status_message = build_site_status_message("down", "https://virtualcustoms.net")
        self.assertEqual("Virtual Customs is offline", status_message["embeds"][0]["title"])
        self.assertEqual(0xED4245, status_message["embeds"][0]["color"])

        with patch.object(feed_module, "fetch_via_http", return_value=b"<html><title>Virtual Customs</title></html>"):
            self.assertTrue(get_site_status("https://virtualcustoms.net"))

        with patch.object(feed_module, "fetch_via_http", return_value=b"Checking your browser before accessing Virtual Customs"):
            self.assertFalse(get_site_status("https://virtualcustoms.net"))

        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = os.path.join(temp_dir, "site-status-state.json")
            with open(state_path, "w", encoding="utf-8") as file:
                json.dump({"status": "down"}, file)

            with patch.dict(
                os.environ,
                {
                    "SITE_URL": "https://virtualcustoms.net",
                    "DISCORD_STATUS_WEBHOOK_URL": "https://example.com/webhook",
                    "SITE_STATUS_STATE_FILE": state_path,
                },
                clear=False,
            ):
                with patch.object(feed_module, "get_site_status", return_value=True), patch.object(feed_module, "post_site_status") as post_status:
                    status_code = main_site_status()
                    self.assertEqual(0, status_code)
                    post_status.assert_called_once_with("https://example.com/webhook", "up", "https://virtualcustoms.net")
                    with open(state_path, "r", encoding="utf-8") as file:
                        self.assertEqual({"status": "up"}, json.load(file))


if __name__ == "__main__":
    unittest.main()
