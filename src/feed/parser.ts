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
  return /\.(jpe?g|png|webp|gif|svg|avif)($|\?)/i.test(clean);
}

function isTrackingPixel(url: string): boolean {
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
  const matches = html.matchAll(/<img\s+[^>]*?src=["'](https?:\/\/[^"'\s>]+)["'][^>]*>/gi);
  for (const match of matches) {
    const fullTag = match[0].toLowerCase();
    const url = match[1];
    if (
      fullTag.includes('width="1"') ||
      fullTag.includes("width='1'") ||
      fullTag.includes('height="1"') ||
      fullTag.includes("height='1'") ||
      isTrackingPixel(url)
    ) {
      continue;
    }
    return url;
  }
  return null;
}

export function findEntryImage(element: XmlElement, descriptionHtml?: string | null): string | null {
  // 1. Check <enclosure>
  for (const child of element.children) {
    if (localName(child) === 'enclosure') {
      const url = child.attributes['url'];
      const type = child.attributes['type']?.toLowerCase() ?? '';
      if (url && (type.startsWith('image/') || isLikelyImageUrl(url))) {
        if (!isTrackingPixel(url)) return url.trim();
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
        if (!isTrackingPixel(url)) return url.trim();
      }
    }
    if (name === 'thumbnail') {
      const url = child.attributes['url'];
      if (url && !isTrackingPixel(url)) return url.trim();
    }
    if (name === 'image') {
      const href = child.attributes['href'] || child.attributes['url'];
      if (href && !isTrackingPixel(href)) return href.trim();
      const urlChild = findChild(child, 'url');
      if (urlChild && urlChild.text.trim() && !isTrackingPixel(urlChild.text.trim())) {
        return urlChild.text.trim();
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
        if (!isTrackingPixel(href)) return href.trim();
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
