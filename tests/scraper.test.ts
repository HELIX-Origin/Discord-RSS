import { describe, expect, it } from 'vitest';
import { parseHtml } from '../src/feed/html.js';
import { absoluteUrl, discoverFeedLinks, scrapeItems } from '../src/feed/scraper.js';

describe('parseHtml', () => {
  it('parses tags, attributes, comments and void tags', () => {
    const html = '<!DOCTYPE html><html><!-- comment --><body><div class=\'box\' id=\'main\'><p>Hello <b>world</b></p><br><img src=\'x.png\'></div></body></html>';
    const root = parseHtml(html);
    const htmlEl = root.children.find((c) => c.tag === 'html')!;
    const body = htmlEl.children.find((c) => c.tag === 'body')!;
    const div = body.children.find((c) => c.tag === 'div')!;
    expect(div.attributes.class).toBe('box');
    expect(div.attributes.id).toBe('main');
    expect(div.text).toBe('Hello world');
    expect(div.children.some((c) => c.tag === 'br')).toBe(true);
    expect(div.children.find((c) => c.tag === 'img')?.attributes.src).toBe('x.png');
  });

  it('handles CDATA and decodes entities', () => {
    const html = '<div>&lt;p&gt; &amp; &quot;text&quot;</div>';
    const root = parseHtml(html);
    const div = root.children.find((c) => c.tag === 'div')!;
    expect(div.text).toBe('<p> & "text"');
  });

  it('tolerates malformed/unclosed tags without removing root', () => {
    const html = '<div><span>text</div>';
    const root = parseHtml(html);
    expect(root.children.find((c) => c.tag === 'div')?.text).toBe('text');
  });
});

describe('scrapeItems', () => {
  const html = `
    <ul class='threads'>
      <li class='thread'>
        <a class='title' href='/thread/1'>First thread</a>
        <p class='desc'>First description</p>
      </li>
      <li class='thread'>
        <a class='title' href='/thread/2'>Second thread</a>
        <p class='desc'>Second description</p>
      </li>
    </ul>
  `;

  it('extracts items using css-ish selectors', () => {
    const root = parseHtml(html);
    const items = scrapeItems(root, {
      itemSelector: 'li.thread',
      titleSelector: 'a.title',
      linkSelector: 'a.title',
      descriptionSelector: 'p.desc',
    });
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('First thread');
    expect(items[0].url).toBe('/thread/1');
    expect(items[0].description).toBe('First description');
  });

  it('returns empty array for missing content', () => {
    expect(scrapeItems(null, { itemSelector: 'li', titleSelector: 'a', linkSelector: 'a' })).toEqual([]);
  });
});

describe('absoluteUrl', () => {
  it('resolves relative urls against a base', () => {
    expect(absoluteUrl('https://example.com/forum/', '/thread/1')).toBe('https://example.com/thread/1');
    expect(absoluteUrl('https://example.com/forum/page', 'thread/1')).toBe('https://example.com/forum/thread/1');
    expect(absoluteUrl('https://example.com/', 'https://other.com/x')).toBe('https://other.com/x');
  });
});

describe('discoverFeedLinks', () => {
  it('finds rss/atom/rdf link tags', () => {
    const html = `<html><head>
      <link rel='alternate' type='application/rss+xml' href='/feed.xml'>
      <link rel='alternate' type='application/atom+xml' href='/atom.xml'>
      <link rel='stylesheet' href='/style.css'>
    </head></html>`;
    const root = parseHtml(html);
    const links = discoverFeedLinks(root, 'https://example.com');
    expect(links).toContain('https://example.com/feed.xml');
    expect(links).toContain('https://example.com/atom.xml');
    expect(links).not.toContain('https://example.com/style.css');
  });
});