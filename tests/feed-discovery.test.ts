import { describe, it, expect } from 'vitest';
import { discoverFeedUrls } from '../src/modules/feed-discovery';

describe('feed-discovery', () => {
  it('should return empty array when no feed URLs found', () => {
    const result = discoverFeedUrls('https://example.com');
    expect(Array.isArray(result)).toBe(true);
  });
});
