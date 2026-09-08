import { childText, childTextList, findChild, localName, parseXml, type XmlElement } from './xml.js';

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  description: string | null;
  publishedAt: string | null;
  author: string | null;
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
  const href = element.attributes['href'];
  if (href) return href;
  return childText(element, 'link') ?? '';
}

function parseRss2(root: XmlElement): ParsedFeed {
  const channel = findChild(root, 'channel');
  if (!channel) throw new Error('RSS document has no <channel>');

  const title = firstChildByLocal(channel, ['title']) ?? 'Untitled feed';
  const feedLink = firstChildByLocal(channel, ['link']) ?? null;
  const items = channel.children.filter((c) => localName(c) === 'item');

  const entries: FeedEntry[] = items.map((item) => {
    const id =
      firstChildByLocal(item, ['guid']) ??
      linkFor(item) ??
      firstChildByLocal(item, ['title']) ??
      '';
    return {
      id: id.trim(),
      title: firstChildByLocal(item, ['title']) ?? 'Untitled entry',
      link: linkFor(item),
      description: firstChildByLocal(item, ['description', 'content:encoded', 'summary']),
      publishedAt: firstChildByLocal(item, ['pubDate', 'date']),
      author: firstChildByLocal(item, ['dc:creator', 'author']),
    };
  });

  return { title, link: feedLink, entries };
}

function parseAtom(root: XmlElement): ParsedFeed {
  const title = firstChildByLocal(root, ['title']) ?? 'Untitled feed';
  const feedLink = linkFor(root);
  const items = root.children.filter((c) => localName(c) === 'entry');

  const entries: FeedEntry[] = items.map((item) => {
    return {
      id: firstChildByLocal(item, ['id']) ?? linkFor(item) ?? '',
      title: firstChildByLocal(item, ['title']) ?? 'Untitled entry',
      link: linkFor(item),
      description: firstChildByLocal(item, ['summary', 'content']),
      publishedAt: firstChildByLocal(item, ['published', 'updated']),
      author: (() => {
        const author = findChild(item, 'author');
        return author ? childText(author, 'name') : null;
      })(),
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

export function stripHtml(text: string | null): string | null {
  if (!text) return null;
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FeedEntryWithGuid extends FeedEntry {
  guid: string;
}

export function withGuid(feed: ParsedFeed, entry: FeedEntry): FeedEntryWithGuid {
  return { ...entry, guid: entry.id || `${feed.link}#${entry.title}` };
}