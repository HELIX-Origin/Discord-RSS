import { fetchRaw, isCloudflareChallenge } from './fetch.js';
import { parseHtml } from './html.js';
import type { ScrapeSelectors } from './scraper.js';
import { discoverFeedLinks, scrapeItems } from './scraper.js';

export interface UrlAnalysis {
  url: string;
  isFeedXml: boolean;
  isHtml: boolean;
  contentType: string | null;
  status: number;
  title: string | null;
  discoveredFeeds: string[];
  sampleEntries: number;
  error: string | null;
}

export async function analyzeUrl(url: string): Promise<UrlAnalysis> {
  const base: UrlAnalysis = {
    url,
    isFeedXml: false,
    isHtml: false,
    contentType: null,
    status: 0,
    title: null,
    discoveredFeeds: [],
    sampleEntries: 0,
    error: null,
  };

  let result;
  try {
    result = await fetchRaw(url);
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }

  base.status = result.status;
  base.contentType = result.contentType;

  if (result.challenged || isCloudflareChallenge(result.contentType, null)) {
    return {
      ...base,
      error: 'This site is behind a Cloudflare challenge and cannot be fetched automatically.',
    };
  }

  const head = result.text.slice(0, 2048).toLowerCase();
  if (/\b(rss|atom|rdf)\b/.test(head) && (head.includes('<rss') || head.includes('<feed') || head.includes('<rdf'))) {
    base.isFeedXml = true;
    return base;
  }

  const root = parseHtml(result.text);
  const feedLinks = discoverFeedLinks(root, url);
  base.isHtml = true;
  base.discoveredFeeds = feedLinks;

  const findTitle = (el: typeof root): typeof root | null => {
    if (el.tag === 'title') return el;
    for (const child of el.children) {
      if (child.tag === '#text') continue;
      const found = findTitle(child);
      if (found) return found;
    }
    return null;
  };
  const titleTag = findTitle(root);
  if (titleTag) base.title = titleTag.text;

  return base;
}

export function extractSample(url: string, html: string, selectors: ScrapeSelectors, count = 5) {
  const root = parseHtml(html);
  const items = scrapeItems(root, selectors).slice(0, count);
  return {
    entries: items.map((item) => ({
      ...item,
      url: item.url
        ? (() => {
            try {
              return new URL(item.url, url).toString();
            } catch {
              return item.url;
            }
          })()
        : url,
    })),
    contentLength: items.length,
  };
}

export async function analyzeScrapeUrl(
  url: string,
  selectors: ScrapeSelectors,
): Promise<{
  url: string;
  status: number;
  error: string | null;
  sample: ReturnType<typeof extractSample>;
}> {
  let result;
  try {
    result = await fetchRaw(url);
  } catch (err) {
    return {
      url,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
      sample: { entries: [], contentLength: 0 },
    };
  }
  if (result.challenged || isCloudflareChallenge(result.contentType, null)) {
    return {
      url,
      status: result.status,
      error: 'This site is behind a Cloudflare challenge.',
      sample: { entries: [], contentLength: 0 },
    };
  }
  return {
    url,
    status: result.status,
    error: null,
    sample: extractSample(url, result.text, selectors),
  };
}
