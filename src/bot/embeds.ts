import { decodeHtmlEntities, extractImageFromHtml } from '../feed/parser.js';
import type { DiscordEmbed } from './types.js';

export type Embed = DiscordEmbed;

export const STANDARD_EMBED_COLOR = 0x06b6d4; // Cyan brand accent
export const SUCCESS_EMBED_COLOR = 0x10b981; // Emerald green
export const ERROR_EMBED_COLOR = 0xef4444; // Red
export const WARN_EMBED_COLOR = 0xf59e0b; // Amber

export const MAX_TITLE_LENGTH = 200;
export const STANDARD_DESC_LENGTH = 400; // Standardized uniform card height
export const MAX_DESC_LENGTH = 600;

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
    return combined.length > 36 ? `${combined.slice(0, 33)}...` : combined;
  } catch {
    return 'Link';
  }
}

export function cleanTitle(title: string, maxLength = MAX_TITLE_LENGTH): string {
  if (!title) return 'Untitled';
  let t = title.replace(/<[^>]+>/g, ' ');
  t = decodeHtmlEntities(t);
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > maxLength) {
    const cutoff = t.lastIndexOf(' ', maxLength);
    t = `${t.slice(0, cutoff > maxLength * 0.7 ? cutoff : maxLength).trimEnd()}...`;
  }
  return t || 'Untitled';
}

export function isValidEmbedImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('1x1') ||
    lower.includes('pixel.gif') ||
    lower.includes('spacer.gif') ||
    lower.includes('feedburner.com') ||
    lower.includes('feedsportal.com') ||
    lower.includes('statcounter.com') ||
    lower.includes('gravatar.com/avatar/default') ||
    lower.includes('data:image') ||
    lower.endsWith('.svg')
  ) {
    return false;
  }
  return true;
}

export function formatMessageDescription(raw: string | null, targetLength = STANDARD_DESC_LENGTH): string | null {
  if (!raw) return null;

  // 1. Remove style, script, noscript, svg, iframe, video, audio
  let text = raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<audio[\s\S]*?<\/audio>/gi, '')
    .replace(/<video[\s\S]*?<\/video>/gi, '');

  // 2. Remove tracking pixels / 1x1 images
  text = text.replace(/<img[^>]*?(?:width=["']1["']|height=["']1["']|tracking|feedburner)[^>]*>/gi, '');

  // 3. Convert HTML links <a href="url">text</a> to clean markdown [label](url)
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
      } else if (label.length > 50) {
        label = `${label.slice(0, 47).trimEnd()}...`;
      }
      return `[${label}](${url})`;
    },
  );

  // 4. Convert structural HTML to clean whitespace / newlines
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n');

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
    .replace(/\bRead more at .*\.?/gi, '')
    .replace(/\[\s*&#8230;\s*\]/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return null;

  // 9. Standardize description length to achieve uniform embed card sizes
  if (text.length > targetLength) {
    const cutoff = text.lastIndexOf(' ', targetLength);
    text = `${text.slice(0, cutoff > targetLength * 0.6 ? cutoff : targetLength).trimEnd()}…`;

    // Balance markdown link brackets if truncated mid-link
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

export const REDDIT_EMBED_COLOR = 0xff4500; // Reddit Orangered

export function feedEmbed(args: {
  title: string;
  url: string;
  description?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  feedTitle: string;
  color?: number;
  imageUrl?: string | null;
  feedType?: string;
}): DiscordEmbed {
  const { title, url, description, author, publishedAt, feedTitle, imageUrl, feedType } = args;
  const isRedditImageFeed = feedType === 'reddit';
  const isRedditDomain = /reddit\.com\/(?:r|user)\//i.test(url);
  const color = args.color ?? (isRedditImageFeed || isRedditDomain ? REDDIT_EMBED_COLOR : STANDARD_EMBED_COLOR);
  const cleanT = cleanTitle(title);

  const embed: DiscordEmbed = {
    title: cleanT,
    url,
    color,
  };

  // For pure Reddit image feeds (feedType === 'reddit'), suppress HTML description text so only image & title show.
  // For standard RSS feeds (including Reddit text/discussion feeds with feedType === 'rss'), format and show description.
  if (!isRedditImageFeed) {
    const cleanDesc = formatMessageDescription(description ?? null, STANDARD_DESC_LENGTH);
    if (cleanDesc) {
      embed.description = cleanDesc;
    }
  }

  if (author) {
    let authorName = cleanTitle(author, 100);
    if (isRedditImageFeed || isRedditDomain) {
      authorName = authorName.replace(/^(\/?u\/)+/i, '');
      authorName = `u/${authorName}`;
    }
    embed.author = { name: authorName };
  }

  embed.footer = { text: feedTitle };

  if (publishedAt) {
    embed.timestamp = normalizeTimestamp(publishedAt);
  }

  // Standardize full-width images: Discord `image` spans the entire 100% width of the embed card
  const primaryImage = imageUrl ?? extractImageFromHtml(description ?? null);
  if (primaryImage && isValidEmbedImageUrl(primaryImage)) {
    embed.image = { url: primaryImage.trim() };
  }

  return embed;
}

function normalizeTimestamp(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
