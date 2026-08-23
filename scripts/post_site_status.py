#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.post_feed_to_discord import main_site_status


if __name__ == "__main__":
    sys.exit(main_site_status())
