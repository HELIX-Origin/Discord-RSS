import { describe, expect, it } from 'vitest';
import { parseFeed, stripHtml, withGuid } from '../src/feed/parser.js';

describe('parseFeed (RSS2)', () => {
  it('parses a minimal RSS2 feed', () => {
    const xml = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><rss version=\'2.0\'><channel><title>My Blog</title><link>https://blog.example</link><description>A blog</description><item><title>Hello</title><link>https://blog.example/hello</link><guid>hello-1</guid><pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate><description>First &amp; last post.</description></item></channel></rss>';
    const feed = parseFeed(xml);
    expect(feed.title).toBe('My Blog');
    expect(feed.link).toBe('https://blog.example');
    expect(feed.entries).toHaveLength(1);
    const entry = feed.entries[0];
    expect(entry.title).toBe('Hello');
    expect(entry.link).toBe('https://blog.example/hello');
    expect(entry.id).toBe('hello-1');
    expect(entry.publishedAt).toBe('Mon, 01 Jan 2026 00:00:00 GMT');
    expect(entry.description).toBe('First & last post.');
  });

  it('falls back to link/title when guid is absent', () => {
    const xml = '<rss><channel><title>C</title><item><title>T</title><link>https://x</link></item></channel></rss>';
    const feed = parseFeed(xml);
    expect(feed.entries[0].id).toBe('https://x');
  });

  it('handles CDATA and HTML in description', () => {
    const xml = '<rss><channel><title>C</title><item><title>T</title><link>https://x</link><description><![CDATA[<p>Hello</p>]]></description></item></channel></rss>';
    const feed = parseFeed(xml);
    expect(feed.entries[0].description).toBe('<p>Hello</p>');
  });

  it('supports content:encoded and summary', () => {
    const xml = '<rss><channel><title>C</title><item><title>T</title><link>https://x</link><content:encoded>encoded body</content:encoded></item></channel></rss>';
    const feed = parseFeed(xml);
    expect(feed.entries[0].description).toBe('encoded body');
  });

  it('extracts dc:creator as author', () => {
    const xml = '<rss xmlns:dc=\'http://purl.org/dc/elements/1.1/\'><channel><title>C</title><item><title>T</title><link>https://x</link><dc:creator>Author Name</dc:creator></item></channel></rss>';
    const feed = parseFeed(xml);
    expect(feed.entries[0].author).toBe('Author Name');
  });
});

describe('parseFeed (Atom)', () => {
  it('parses a minimal Atom feed', () => {
    const xml = '<?xml version=\'1.0\'?><feed xmlns=\'http://www.w3.org/2005/Atom\'><title>Atom Feed</title><link href=\'https://atom.example\'/><entry><id>e1</id><title>Entry One</title><link href=\'https://atom.example/e1\'/><summary>Summary text</summary><published>2026-01-01T00:00:00Z</published><updated>2026-01-02T00:00:00Z</updated></entry></feed>';
    const feed = parseFeed(xml);
    expect(feed.title).toBe('Atom Feed');
    expect(feed.link).toBe('https://atom.example');
    expect(feed.entries).toHaveLength(1);
    const entry = feed.entries[0];
    expect(entry.id).toBe('e1');
    expect(entry.title).toBe('Entry One');
    expect(entry.link).toBe('https://atom.example/e1');
    expect(entry.description).toBe('Summary text');
    expect(entry.publishedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('extracts author name from atom:author', () => {
    const xml = '<feed xmlns=\'http://www.w3.org/2005/Atom\'><title>C</title><entry><id>e</id><title>T</title><link href=\'https://x\'/><author><name>Alice</name></author></entry></feed>';
    const feed = parseFeed(xml);
    expect(feed.entries[0].author).toBe('Alice');
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
    expect(stripHtml('<style>.x{}</style><div>text</div>')).toBe('text');
    expect(stripHtml(null)).toBeNull();
  });
});

describe('withGuid', () => {
  it('returns entry with guid, defaulting from feed link and title', () => {
    const feed = { title: 'F', link: 'https://feed.example', entries: [] };
    const entry = { id: '', title: 'T', link: 'https://t', description: null, publishedAt: null, author: null };
    expect(withGuid(feed, entry).guid).toBe('https://feed.example#T');
    const withId = { ...entry, id: 'id-1' };
    expect(withGuid(feed, withId).guid).toBe('id-1');
  });
});