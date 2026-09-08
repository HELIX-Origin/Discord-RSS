import { describe, it, expect } from 'vitest';
import { loadFeedUrls } from '../src/functions/feed-loader';

describe('feed-loader', () => {
  it('should return empty array when no feed secrets exist', () => {
    const urls = loadFeedUrls('FORUM');
    expect(urls).toBeInstanceOf(Array);
  });

  it('should load feed URLs from environment matching {SOURCE}_RSS_URL_{###}', () => {
    process.env['VBULLETIN_RSS_URL_001'] = 'https://forum.example/feed.xml';
    process.env['VBULLETIN_RSS_URL_002'] = 'https://forum.example/atom.xml';

    const urls = loadFeedUrls('VBULLETIN');
    expect(urls).toContain('https://forum.example/feed.xml');
    expect(urls).toContain('https://forum.example/atom.xml');

    delete process.env['VBULLETIN_RSS_URL_001'];
    delete process.env['VBULLETIN_RSS_URL_002'];
  });
});
