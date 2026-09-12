import { childText, findChild, localName, parseXml, type XmlElement } from './xml.js';

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  description: string | null;
  publishedAt: string | null;
  author: string | null;
  imageUrl: string | null;
}

export interface ParsedFeed {
  title: string;
  link: string | null;
  entries: FeedEntry[];
}

const firstChildByLocal = (element: XmlElement, names: string[]): string | null => {
  for (const name of names) {
    const child = findChild(element, name);
    if (child) return child.text.trim();
  }
  return null;
};

function linkFor(element: XmlElement): string {
  const linkChild = findChild(element, 'link');
  if (linkChild) {
    const href = linkChild.attributes['href'];
    if (href) return href;
    return linkChild.text.trim();
  }
  return '';
}

function isLikelyImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  return /\.(jpe?g|png|webp|gif|gifv|svg|avif)($|\?)/i.test(clean) || clean.includes('giphy.com/gifs/');
}

export function normalizeImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = decodeHtmlEntities(rawUrl.trim());
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  // 1. Imgur .gifv / .mp4 -> direct .gif for Discord animated display
  if (/^https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)\.(?:gifv|mp4)(?:\?[^"'\s>]*)?$/i.test(url)) {
    url = url.replace(
      /^https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)\.(?:gifv|mp4)(?:\?[^"'\s>]*)?$/i,
      'https://i.imgur.com/$1.gif',
    );
  } else if (/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)\.gif(?:\?[^"'\s>]*)?$/i.test(url)) {
    url = url.replace(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)\.gif(?:\?[^"'\s>]*)?$/i, 'https://i.imgur.com/$1.gif');
  }
  // 2. Giphy page links -> direct media .gif
  else if (/^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)(?:\/)?(?:\?[^"'\s>]*)?$/i.test(url)) {
    url = url.replace(
      /^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)(?:\/)?(?:\?[^"'\s>]*)?$/i,
      'https://media.giphy.com/media/$1/giphy.gif',
    );
  }
  // 3. Gfycat links -> direct .gif
  else if (/^https?:\/\/gfycat\.com\/([a-zA-Z0-9]+)(?:\?[^"'\s>]*)?$/i.test(url)) {
    url = url.replace(
      /^https?:\/\/gfycat\.com\/([a-zA-Z0-9]+)(?:\?[^"'\s>]*)?$/i,
      'https://thumbs.gfycat.com/$1-size_restricted.gif',
    );
  }

  return url;
}

export function isTrackingPixel(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('1x1') ||
    lower.includes('pixel') ||
    lower.includes('tracking') ||
    lower.includes('beacon') ||
    lower.includes('feedburner.com/~r') ||
    lower.includes('feedsportal.com')
  );
}

export function extractImageFromHtml(html: string | null): string | null {
  if (!html) return null;

  // 1. Priority 1: Check for direct animated GIF links in <a> or <img> tags
  // This ensures Reddit/Imgur/Giphy GIF posts extract the real animated GIF rather than static preview JPEGs
  const gifMatches = html.matchAll(
    /<a\s+[^>]*?href=["'](https?:\/\/(?:i\.redd\.it\/[^\s"'>]+\.gif|i\.imgur\.com\/[^\s"'>]+\.(?:gif|gifv|mp4)|imgur\.com\/[^\s"'>]+\.(?:gif|gifv|mp4)|(?:www\.)?giphy\.com\/gifs\/[^\s"'>]+|media\.giphy\.com\/media\/[^\s"'>]+\.gif|[^\s"'>]+\.gif)(?:\?[^"'\s>]*)?)["'][^>]*>/gi,
  );
  for (const match of gifMatches) {
    const raw = decodeHtmlEntities(match[1]);
    const normalized = normalizeImageUrl(raw);
    if (
      normalized &&
      !isTrackingPixel(normalized) &&
      !normalized.includes('/avatar/') &&
      !normalized.includes('/emojis/')
    ) {
      return normalized;
    }
  }

  // Also check <img> tags for direct .gif
  const imgGifMatches = html.matchAll(/<img\s+[^>]*?src=["'](https?:\/\/[^"'\s>]+\.gif(?:\?[^"'\s>]*)?)["'][^>]*>/gi);
  for (const match of imgGifMatches) {
    const raw = decodeHtmlEntities(match[1]);
    const normalized = normalizeImageUrl(raw);
    if (
      normalized &&
      !isTrackingPixel(normalized) &&
      !normalized.includes('/avatar/') &&
      !normalized.includes('/emojis/')
    ) {
      return normalized;
    }
  }

  // 2. Priority 2: Check for full-res image links in <a> tags (common in Reddit feeds: <a href="https://i.redd.it/...">[link]</a>)
  const aMatches = html.matchAll(
    /<a\s+[^>]*?href=["'](https?:\/\/(?:i\.redd\.it|i\.imgur\.com|[^\s"'>]+\.(?:jpe?g|png|webp|gif|gifv|avif))(?:\?[^"'\s>]*)?)["'][^>]*>/gi,
  );
  for (const match of aMatches) {
    const raw = decodeHtmlEntities(match[1]);
    const normalized = normalizeImageUrl(raw);
    if (
      normalized &&
      !isTrackingPixel(normalized) &&
      !normalized.includes('/avatar/') &&
      !normalized.includes('/emojis/')
    ) {
      return normalized;
    }
  }

  // 3. Priority 3: Check <img> tags
  const imgMatches = html.matchAll(/<img\s+[^>]*?src=["'](https?:\/\/[^"'\s>]+)["'][^>]*>/gi);
  for (const match of imgMatches) {
    const fullTag = match[0].toLowerCase();
    const raw = decodeHtmlEntities(match[1]);
    if (
      fullTag.includes('width="1"') ||
      fullTag.includes("width='1'") ||
      fullTag.includes('height="1"') ||
      fullTag.includes("height='1'") ||
      isTrackingPixel(raw)
    ) {
      continue;
    }
    const normalized = normalizeImageUrl(raw);
    if (normalized) return normalized;
  }
  return null;
}

export function findEntryImage(element: XmlElement, descriptionHtml?: string | null): string | null {
  // 0. If the description HTML has a direct animated GIF link, prioritize that over static thumbnails
  if (descriptionHtml) {
    const directGif = extractImageFromHtml(descriptionHtml);
    if (directGif && directGif.toLowerCase().includes('.gif')) {
      return directGif;
    }
  }

  // 1. Check <enclosure>
  for (const child of element.children) {
    if (localName(child) === 'enclosure') {
      const url = child.attributes['url'];
      const type = child.attributes['type']?.toLowerCase() ?? '';
      if (url && (type.startsWith('image/') || isLikelyImageUrl(url))) {
        if (!isTrackingPixel(url)) return normalizeImageUrl(url.trim());
      }
    }
  }

  // 2. Check <media:content>, <media:thumbnail>, <itunes:image>
  for (const child of element.children) {
    const name = localName(child);
    if (name === 'content') {
      const url = child.attributes['url'];
      const type = child.attributes['type']?.toLowerCase() ?? '';
      const medium = child.attributes['medium']?.toLowerCase() ?? '';
      if (url && (medium === 'image' || type.startsWith('image/') || isLikelyImageUrl(url))) {
        if (!isTrackingPixel(url)) return normalizeImageUrl(url.trim());
      }
    }
    if (name === 'thumbnail') {
      const url = child.attributes['url'];
      if (url && !isTrackingPixel(url)) return normalizeImageUrl(url.trim());
    }
    if (name === 'image') {
      const href = child.attributes['href'] || child.attributes['url'];
      if (href && !isTrackingPixel(href)) return normalizeImageUrl(href.trim());
      const urlChild = findChild(child, 'url');
      if (urlChild && urlChild.text.trim() && !isTrackingPixel(urlChild.text.trim())) {
        return normalizeImageUrl(urlChild.text.trim());
      }
    }
  }

  // 3. Check Atom <link rel="enclosure"> or <link rel="preview">
  for (const child of element.children) {
    if (localName(child) === 'link') {
      const rel = child.attributes['rel']?.toLowerCase();
      const type = child.attributes['type']?.toLowerCase() ?? '';
      const href = child.attributes['href'];
      if (href && (rel === 'enclosure' || rel === 'preview') && (type.startsWith('image/') || isLikelyImageUrl(href))) {
        if (!isTrackingPixel(href)) return normalizeImageUrl(href.trim());
      }
    }
  }

  // 4. Fallback to extracting image from HTML description/content
  return extractImageFromHtml(descriptionHtml ?? null);
}

function parseRss2(root: XmlElement): ParsedFeed {
  const channel = findChild(root, 'channel');
  if (!channel) throw new Error('RSS document has no <channel>');

  const title = firstChildByLocal(channel, ['title']) ?? 'Untitled feed';
  const feedLink = firstChildByLocal(channel, ['link']) ?? null;
  const items = channel.children.filter((c) => localName(c) === 'item');

  const entries: FeedEntry[] = items.map((item) => {
    const id = firstChildByLocal(item, ['guid']) ?? linkFor(item) ?? firstChildByLocal(item, ['title']) ?? '';
    const desc = firstChildByLocal(item, ['description', 'encoded', 'summary']);
    const imageUrl = findEntryImage(item, desc);
    return {
      id: id.trim(),
      title: firstChildByLocal(item, ['title']) ?? 'Untitled entry',
      link: linkFor(item),
      description: desc,
      publishedAt: firstChildByLocal(item, ['pubDate', 'date']),
      author: firstChildByLocal(item, ['creator', 'author']),
      imageUrl,
    };
  });

  return { title, link: feedLink, entries };
}

function parseAtom(root: XmlElement): ParsedFeed {
  const title = firstChildByLocal(root, ['title']) ?? 'Untitled feed';
  const feedLink = linkFor(root);
  const items = root.children.filter((c) => localName(c) === 'entry');

  const entries: FeedEntry[] = items.map((item) => {
    const desc = firstChildByLocal(item, ['summary', 'content']);
    const imageUrl = findEntryImage(item, desc);
    return {
      id: firstChildByLocal(item, ['id']) ?? linkFor(item) ?? '',
      title: firstChildByLocal(item, ['title']) ?? 'Untitled entry',
      link: linkFor(item),
      description: desc,
      publishedAt: firstChildByLocal(item, ['published', 'updated']),
      author: (() => {
        const author = findChild(item, 'author');
        return author ? childText(author, 'name') : null;
      })(),
      imageUrl,
    };
  });

  return { title, link: feedLink, entries };
}

export function parseFeed(xml: string): ParsedFeed {
  const { root } = parseXml(xml);
  const rootName = localName(root);

  if (rootName === 'feed') return parseAtom(root);
  if (rootName === 'rss' || rootName === 'rdf') return parseRss2(root);

  throw new Error(`Unsupported feed root element: ${rootName}`);
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_m, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? '' : String.fromCodePoint(code);
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? '' : String.fromCodePoint(code);
    });
}

export function stripHtml(text: string | null): string | null {
  if (!text) return null;
  const stripped = text
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return decodeHtmlEntities(stripped);
}

export interface FeedEntryWithGuid extends FeedEntry {
  guid: string;
}

export function withGuid(feed: ParsedFeed, entry: FeedEntry): FeedEntryWithGuid {
  return { ...entry, guid: entry.id || `${feed.link}#${entry.title}` };
}
