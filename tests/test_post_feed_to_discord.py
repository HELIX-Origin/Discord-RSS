import unittest

from scripts.post_feed_to_discord import (
    DEFAULT_ALLOWED_HOSTS,
    DEFAULT_EXCLUDED_SUBSTRINGS,
    Entry,
    build_discord_message,
    is_allowed,
    is_excluded,
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


if __name__ == "__main__":
    unittest.main()
