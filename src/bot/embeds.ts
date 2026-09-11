import { decodeHtmlEntities, extractImageFromHtml } from '../feed/parser.js';
import type { DiscordEmbed } from './types.js';

export type Embed = DiscordEmbed;

export function formatReadableUrlLabel(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./i, '');
    let path = parsed.pathname.replace(/\/+$/, '');
    if (!path || path === '/') {
      return host;
    }
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 2) {
      path = `/${segments[0]}/.../${segments[segments.length - 1]}`;
    }
    const combined = `${host}${path}`;
    return combined.length > 40 ? `${combined.slice(0, 37)}...` : combined;
  } catch {
    return 'Link';
  }
}

export function cleanTitle(title: string): string {
  if (!title) return 'Untitled';
  let t = title.replace(/<[^>]+>/g, ' ');
  t = decodeHtmlEntities(t);
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > 256) {
    t = `${t.slice(0, 253).trimEnd()}...`;
  }
  return t || 'Untitled';
}

export function formatMessageDescription(raw: string | null): string | null {
  if (!raw) return null;

  // 1. Remove style, script, noscript, svg
  let text = raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // 2. Remove tracking pixels / 1x1 images
  text = text.replace(/<img[^>]*?(?:width=["']1["']|height=["']1["']|tracking|feedburner)[^>]*>/gi, '');

  // 3. Convert HTML links <a href="url">text</a> to markdown [label](url)
  text = text.replace(
    /<a\s+[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, inner: string) => {
      const url = href.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) return '';
      const cleanInner = inner
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const decodedInner = decodeHtmlEntities(cleanInner);
      let label = decodedInner;
      if (!label || label.startsWith('http://') || label.startsWith('https://') || label === url) {
        label = formatReadableUrlLabel(url);
      } else if (label.length > 60) {
        label = `${label.slice(0, 57).trimEnd()}...`;
      }
      return `[${label}](${url})`;
    },
  );

  // 4. Convert structural HTML to whitespace / newlines
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ');

  // 5. Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 6. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 7. Convert standalone plain-text URLs to readable markdown links
  text = text.replace(/(^|[^\](])(https?:\/\/[^\s<>)\]]+)/gi, (_match, prefix: string, rawUrl: string) => {
    let cleanUrl = rawUrl;
    let trailing = '';
    const punctMatch = cleanUrl.match(/[.,;:!?)]+$/);
    if (punctMatch) {
      trailing = punctMatch[0];
      cleanUrl = cleanUrl.slice(0, -trailing.length);
    }
    const label = formatReadableUrlLabel(cleanUrl);
    return `${prefix}[${label}](${cleanUrl})${trailing}`;
  });

  // 8. Clean boilerplate & whitespace
  text = text
    .replace(/\bThe post .* appeared first on .*\.?/gi, '')
    .replace(/\[\s*&#8230;\s*\]/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return null;

  // 9. Truncate cleanly if too long for Discord embed description (max 2048)
  if (text.length > 1800) {
    const cutoff = text.lastIndexOf(' ', 1800);
    text = `${text.slice(0, cutoff > 1200 ? cutoff : 1800).trimEnd()}...`;
    const openBrackets = (text.match(/\[/g) || []).length;
    const closeBrackets = (text.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      text += ']';
    }
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      text += ')';
    }
  }

  return text;
}

export function feedEmbed(args: {
  title: string;
  url: string;
  description?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  feedTitle: string;
  color: number;
  imageUrl?: string | null;
}): DiscordEmbed {
  const { title, url, description, author, publishedAt, feedTitle, color, imageUrl } = args;
  const cleanT = cleanTitle(title);
  const cleanDesc = formatMessageDescription(description ?? null);

  const embed: DiscordEmbed = { title: cleanT, url, color };

  if (cleanDesc) {
    embed.description = cleanDesc;
  }
  if (author) {
    embed.author = { name: cleanTitle(author).slice(0, 256) };
  }
  embed.footer = { text: feedTitle };
  if (publishedAt) {
    embed.timestamp = normalizeTimestamp(publishedAt);
  }

  const primaryImage = imageUrl ?? extractImageFromHtml(description ?? null);
  if (primaryImage) {
    embed.image = { url: primaryImage };
  }

  return embed;
}

function normalizeTimestamp(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
