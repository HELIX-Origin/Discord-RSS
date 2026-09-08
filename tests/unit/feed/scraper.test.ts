import { describe, expect, it } from 'vitest';
import { parseHtml } from '../../../src/feed/html.js';
import { scrapeItems, discoverFeedLinks, absoluteUrl } from '../../../src/feed/scraper.js';

describe('parseHtml', () => {
  it('parses nested elements', () => {
    const root = parseHtml('<div><p>hello</p></div>');
    expect(root.children[0]?.tag).toBe('div');
    expect(root.children[0]?.children[0]?.text).toBe('hello');
  });

  it('decodes entities', () => {
    const root = parseHtml('<p>&lt;hello&gt;</p>');
    expect(root.children[0]?.text).toBe('<hello>');
  });

  it('ignores comments and doctype', () => {
    const root = parseHtml('<!DOCTYPE html><!-- x --><p>a</p>');
    expect(root.children[0]?.tag).toBe('p');
  });

  it('collapses text across children', () => {
    const root = parseHtml('<div><span>one</span> <span>two</span></div>');
    expect(root.children[0]?.text).toBe('one two');
  });
});

describe('scraper', () => {
  it('extracts items by selectors', () => {
    const html = `
      <div class="item">
        <a class="title" href="/post/1">First</a>
        <p class="desc">Desc</p>
      </div>
      <div class="item">
        <a class="title" href="/post/2">Second</a>
      </div>
    `;
    const root = parseHtml(html);
    const items = scrapeItems(root, {
      itemSelector: '.item',
      titleSelector: '.title',
      linkSelector: '.title',
      descriptionSelector: '.desc',
    });
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe('First');
    expect(items[0]?.url).toBe('/post/1');
    expect(items[1]?.description).toBeNull();
  });

  it('resolves absolute URLs', () => {
    const root = parseHtml('<div class="item"><a href="/path">x</a></div>');
    const items = scrapeItems(root, {
      itemSelector: '.item',
      titleSelector: 'a',
      linkSelector: 'a',
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.url).toBe('/path');
    expect(absoluteUrl('https://example.com/base', items[0]!.url)).toBe('https://example.com/path');
  });

  it('discovers feed links', () => {
    const root = parseHtml(`
      <head>
        <link rel="alternate" type="application/rss+xml" href="/feed.xml">
        <link rel="alternate" type="application/atom+xml" href="https://other.com/atom">
      </head>
    `);
    const links = discoverFeedLinks(root, 'https://example.com');
    expect(links).toContain('https://example.com/feed.xml');
    expect(links).toContain('https://other.com/atom');
  });
});
