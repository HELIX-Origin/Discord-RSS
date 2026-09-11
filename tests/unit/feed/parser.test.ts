import { describe, expect, it } from 'vitest';
import { parseFeed, stripHtml, withGuid } from '../../../src/feed/parser.js';

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Entry One</title>
      <link>https://example.com/1</link>
      <guid>entry-1</guid>
      <description><![CDATA[<p>hello</p>]]></description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <link href="https://example.com"/>
  <entry>
    <title>Atom Entry</title>
    <link href="https://example.com/a"/>
    <id>atom-1</id>
    <summary>summary text</summary>
    <updated>2024-01-01T00:00:00Z</updated>
    <author><name>Author Name</name></author>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('parses RSS 2.0', () => {
    const feed = parseFeed(RSS);
    expect(feed.title).toBe('Test Feed');
    expect(feed.link).toBe('https://example.com');
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0]?.title).toBe('Entry One');
    expect(feed.entries[0]?.link).toBe('https://example.com/1');
    expect(feed.entries[0]?.id).toBe('entry-1');
  });

  it('parses Atom', () => {
    const feed = parseFeed(ATOM);
    expect(feed.title).toBe('Atom Feed');
    expect(feed.link).toBe('https://example.com');
    expect(feed.entries[0]?.title).toBe('Atom Entry');
    expect(feed.entries[0]?.link).toBe('https://example.com/a');
    expect(feed.entries[0]?.author).toBe('Author Name');
  });

  it('extracts primary image from enclosure, media:content, and HTML img', () => {
    const rssWithImages = `<?xml version="1.0"?>
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <title>Media Feed</title>
        <item>
          <title>Item 1</title>
          <link>https://example.com/item1</link>
          <enclosure url="https://example.com/hero.jpg" type="image/jpeg" length="12345"/>
        </item>
        <item>
          <title>Item 2</title>
          <link>https://example.com/item2</link>
          <media:content url="https://example.com/media-image.png" medium="image"/>
        </item>
        <item>
          <title>Item 3</title>
          <link>https://example.com/item3</link>
          <description><![CDATA[<p>Content with <img src="https://example.com/inline-photo.webp" alt="photo"/></p>]]></description>
        </item>
      </channel>
    </rss>`;
    const feed = parseFeed(rssWithImages);
    expect(feed.entries[0]?.imageUrl).toBe('https://example.com/hero.jpg');
    expect(feed.entries[1]?.imageUrl).toBe('https://example.com/media-image.png');
    expect(feed.entries[2]?.imageUrl).toBe('https://example.com/inline-photo.webp');
  });

  it('extracts primary image from Atom link enclosure', () => {
    const atomWithImage = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Atom Media</title>
      <entry>
        <title>Atom Photo</title>
        <link rel="enclosure" type="image/png" href="https://example.com/atom-enclosure.png"/>
      </entry>
    </feed>`;
    const feed = parseFeed(atomWithImage);
    expect(feed.entries[0]?.imageUrl).toBe('https://example.com/atom-enclosure.png');
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  it('decodes HTML entities', () => {
    expect(stripHtml('AT&amp;T &quot;Earnings&quot; &#8211; Up &gt; Down')).toBe('AT&T "Earnings" – Up > Down');
  });

  it('returns null for null input', () => {
    expect(stripHtml(null)).toBeNull();
  });
});

describe('withGuid', () => {
  it('uses entry id when present', () => {
    const entry = {
      id: 'abc',
      title: 't',
      link: 'l',
      description: null,
      publishedAt: null,
      author: null,
      imageUrl: null,
    };
    expect(withGuid({ title: 'f', link: 'fl', entries: [] }, entry).guid).toBe('abc');
  });

  it('falls back to feed link plus title', () => {
    const entry = { id: '', title: 't', link: 'l', description: null, publishedAt: null, author: null, imageUrl: null };
    expect(withGuid({ title: 'f', link: 'fl', entries: [] }, entry).guid).toBe('fl#t');
  });
});
