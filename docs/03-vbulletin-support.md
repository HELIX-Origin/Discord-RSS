# vBulletin support for site hosts

This is an optional improvement, not a requirement. If the site host is running vBulletin, enabling clean support for standard RSS/Atom outputs can make the feed bot more reliable and easier to maintain.

## Why this helps

The automation already works by discovering feed URLs and parsing RSS/Atom. However, a site that exposes clean, stable, and easy-to-discover feed endpoints tends to be:

- easier for the bot to read
- less likely to produce noisy or inconsistent links
- easier to maintain if the board changes layout or routing
- more resilient when anti-bot or challenge protections are enabled

## Recommended vBulletin setup

If the board is running vBulletin, the site host should verify the following in the forum administration panel:

1. RSS/Atom feeds are enabled in the board settings or feed administration area.
2. The board exposes a valid feed for the main forum or thread list.
3. The forum URL is stable and does not redirect unpredictably.
4. The feed is accessible without requiring a login when the public feed is supposed to be public.
5. Known noisy forum pages or team-only sections are excluded from public feed output where possible.

## Common vBulletin feed patterns

vBulletin commonly exposes feed endpoints in standard URL forms, often by appending a feed type or using a forum-specific route. Site hosts should ensure the feed endpoint is publicly reachable and consistent.

Examples of what to verify include:

- a forum page that exposes an `rss` or `atom` alternate link
- a route that resolves to the main board feed instead of a challenge page
- feed links that are available without requiring the user to be logged in

## Good support practices for the host

The site host can improve compatibility by doing the following:

- keep a public, standard RSS/Atom feed endpoint available for the board
- avoid redirecting the public feed URL to a login page or challenge page
- expose stable links for forum pages and thread pages
- document the public feed endpoint in the site’s own admin or help pages
- test the feed manually before enabling the automation

## Optional support statement

The project is intentionally designed to work without site-specific integration. A host that adds support can make the automation smoother, but it is not required for the repository to function.

If the site host chooses to support the project, the safest approach is to keep the feed link accessible and standard, rather than introducing custom logic or custom routing that could break the feed parser.

## Recommended validation checklist for the host

Before enabling or advertising support, confirm all of the following:

- the feed URL returns valid XML
- the XML is parseable by standard RSS/Atom readers
- the feed does not require authentication
- the feed exposes current thread content instead of only a static page
- the board’s public feed remains available even when the forum is under load
