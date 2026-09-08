import { loadFeedUrls } from '../functions/feed-loader';

export function discoverFeedUrls(siteUrl: string): string[] {
  return loadFeedUrls('FORUM').concat(loadFeedUrls('SITE'));
}
