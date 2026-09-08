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

  it('throws on unsupported roots', () => {
    expect(() => parseFeed('<html></html>')).toThrow('Unsupported feed root');
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  it('returns null for null input', () => {
    expect(stripHtml(null)).toBeNull();
  });
});

describe('withGuid', () => {
  it('uses entry id when present', () => {
    const entry = { id: 'abc', title: 't', link: 'l', description: null, publishedAt: null, author: null };
    expect(withGuid({ title: 'f', link: 'fl', entries: [] }, entry).guid).toBe('abc');
  });

  it('falls back to feed link plus title', () => {
    const entry = { id: '', title: 't', link: 'l', description: null, publishedAt: null, author: null };
    expect(withGuid({ title: 'f', link: 'fl', entries: [] }, entry).guid).toBe('fl#t');
  });
});
