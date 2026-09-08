import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { analyzeUrl, extractSample } from '../../../src/feed/builder.js';

describe('builder', () => {
  const server = createServer();
  let url = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        url = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('identifies an RSS feed', async () => {
    server.removeAllListeners('request');
    server.on('request', (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/rss+xml' });
      res.end('<?xml version="1.0"?><rss><channel><title>Feed</title></channel></rss>');
    });
    const result = await analyzeUrl(url);
    expect(result.isFeedXml).toBe(true);
    expect(result.error).toBeNull();
  });

  it('discovers feed links in HTML', async () => {
    server.removeAllListeners('request');
    server.on('request', (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"><title>Site</title></head></html>',
      );
    });
    const result = await analyzeUrl(url);
    expect(result.isHtml).toBe(true);
    expect(result.discoveredFeeds).toContain(`${url}/feed.xml`);
    expect(result.title).toBe('Site');
  });

  it('extracts scrape samples', () => {
    const html = '<div class="item"><h2><a href="/1">One</a></h2></div>';
    const sample = extractSample(url, html, { itemSelector: '.item', titleSelector: 'h2', linkSelector: 'a' });
    expect(sample.entries).toHaveLength(1);
    expect(sample.entries[0]?.title).toBe('One');
    expect(sample.entries[0]?.url).toContain('/1');
  });
});
