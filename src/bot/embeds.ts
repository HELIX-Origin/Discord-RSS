import { appDisplayName, type AppDeps } from '../app.js';
import { decodeHtmlEntities, extractImageFromHtml, isTrackingPixel, normalizeImageUrl } from '../feed/parser.js';
import { PLATFORM_BRANDING, type FreeGameItem } from '../feed/freegames.js';
import type { DiscordEmbed } from './types.js';

export type Embed = DiscordEmbed;

export const STANDARD_EMBED_COLOR = 0x06b6d4; // Cyan brand accent
export const SUCCESS_EMBED_COLOR = 0x10b981; // Emerald green
export const ERROR_EMBED_COLOR = 0xef4444; // Red
export const WARN_EMBED_COLOR = 0xf59e0b; // Amber

export interface AppBranding {
  appName: string;
  iconUrl: string | null;
}

export function appBranding(deps: AppDeps): AppBranding {
  return {
    appName: appDisplayName(deps),
    iconUrl: deps.bot?.getAppIconUrl() ?? null,
  };
}

export function brandAuthor(branding: AppBranding): { name: string; icon_url?: string } {
  const author: { name: string; icon_url?: string } = { name: branding.appName };
  if (branding.iconUrl) {
    author.icon_url = branding.iconUrl;
  }
  return author;
}

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

export interface ExtractedLink {
  label: string;
  url: string;
}

export function extractDescriptionAndLinks(
  raw: string | null,
  targetLength = STANDARD_DESC_LENGTH,
): { description: string | null; links: ExtractedLink[] } {
  if (!raw) return { description: null, links: [] };

  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

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

  // 3. Extract <a> links and clean them out of the message body prose into structured fields
  text = text.replace(
    /<a\s+[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, inner: string) => {
      const cleanUrl = href.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) return '';

      const cleanInner = inner
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const decodedInner = decodeHtmlEntities(cleanInner);

      const lowerInner = decodedInner.toLowerCase();
      const isBoilerplate =
        lowerInner === '[link]' ||
        lowerInner === '[comments]' ||
        lowerInner === 'link' ||
        lowerInner === 'comments' ||
        lowerInner === 'read more' ||
        lowerInner === 'continue reading' ||
        lowerInner.startsWith('http://') ||
        lowerInner.startsWith('https://');

      let label = isBoilerplate || !decodedInner ? formatReadableUrlLabel(cleanUrl) : decodedInner;
      if (label.length > 45) {
        label = `${label.slice(0, 42).trimEnd()}...`;
      }

      if (!seenUrls.has(cleanUrl) && !isTrackingPixel(cleanUrl)) {
        seenUrls.add(cleanUrl);
        links.push({ label, url: cleanUrl });
      }

      // If it was boilerplate like "[comments]" or raw URL, remove from prose; else keep the clean inner words
      return isBoilerplate ? ' ' : decodedInner;
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

  // 7. Remove standalone raw URLs from the prose text (so links only live in dedicated fields)
  text = text.replace(/https?:\/\/[^\s<>)\]]+/gi, (rawUrl) => {
    let cleanUrl = rawUrl;
    const punctMatch = cleanUrl.match(/[.,;:!?)]+$/);
    if (punctMatch) {
      cleanUrl = cleanUrl.slice(0, -punctMatch[0].length);
    }
    if (!seenUrls.has(cleanUrl) && !isTrackingPixel(cleanUrl)) {
      seenUrls.add(cleanUrl);
      links.push({ label: formatReadableUrlLabel(cleanUrl), url: cleanUrl });
    }
    return '';
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

  if (!text) return { description: null, links };

  // 9. Standardize description length to achieve uniform embed card sizes
  if (text.length > targetLength) {
    const cutoff = text.lastIndexOf(' ', targetLength);
    text = `${text.slice(0, cutoff > targetLength * 0.6 ? cutoff : targetLength).trimEnd()}…`;
  }

  return { description: text || null, links };
}

export function formatMessageDescription(raw: string | null, targetLength = STANDARD_DESC_LENGTH): string | null {
  return extractDescriptionAndLinks(raw, targetLength).description;
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
  brandIconUrl?: string | null;
}): DiscordEmbed {
  const { title, url, description, author, publishedAt, feedTitle, imageUrl, feedType, brandIconUrl } = args;
  const isRedditImageFeed = feedType === 'reddit';
  const isRedditDomain = /reddit\.com\/(?:r|user)\//i.test(url);
  const color = args.color ?? (isRedditImageFeed || isRedditDomain ? REDDIT_EMBED_COLOR : STANDARD_EMBED_COLOR);
  const cleanT = cleanTitle(title);
  const embedIcon = brandIconUrl ?? null;

  const embed: DiscordEmbed = {
    title: cleanT,
    url,
    color,
  };

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  // For pure Reddit image feeds (feedType === 'reddit'), suppress HTML description text so only image & title show.
  // For standard RSS feeds (including News Feeds catalog and Reddit text feeds), format clean prose and put links in dedicated fields.
  if (!isRedditImageFeed) {
    const { description: cleanDesc, links } = extractDescriptionAndLinks(description ?? null, STANDARD_DESC_LENGTH);
    if (cleanDesc) {
      embed.description = cleanDesc;
    }

    // 1. Reddit text feeds keep a dedicated discussion link; standard RSS entry titles already link to their source URL directly.
    if (url && isRedditDomain) {
      fields.push({
        name: '💬 Discussion',
        value: `[View on Reddit 💬](${url})`,
        inline: true,
      });
    }

    // 2. Extra Reference Links (if any other distinct links were found in the entry content)
    const extraLinks = links.filter((l) => l.url !== url && !url.includes(l.url) && !l.url.includes(url)).slice(0, 3);
    if (extraLinks.length > 0) {
      fields.push({
        name: '📎 Related Links',
        value: extraLinks.map((l) => `• [${l.label}](${l.url})`).join('\n'),
        inline: extraLinks.length === 1,
      });
    }

    // 3. Bot branding mark as the card's corner thumbnail
    if (embedIcon) {
      embed.thumbnail = { url: embedIcon };
    }
  }

  if (fields.length > 0) {
    embed.fields = fields;
  }

  if (author) {
    let authorName = cleanTitle(author, 100);
    if (isRedditImageFeed || isRedditDomain) {
      authorName = authorName.replace(/^(\/?u\/)+/i, '');
      authorName = `u/${authorName}`;
    }
    embed.author = { name: authorName };
    if (embedIcon) {
      embed.author.icon_url = embedIcon;
    }
  }

  embed.footer = { text: feedTitle };

  if (publishedAt) {
    embed.timestamp = normalizeTimestamp(publishedAt);
  }

  // Standardize single shared full-width image scaling: Discord `image` spans 100% full width of the embed card
  const rawImage = imageUrl ?? extractImageFromHtml(description ?? null);
  const primaryImage = normalizeImageUrl(rawImage);
  if (primaryImage && isValidEmbedImageUrl(primaryImage)) {
    embed.image = { url: primaryImage.trim() };
  }

  return embed;
}

export function freeGameEmbed(game: FreeGameItem, feedTitle = 'Free Games'): DiscordEmbed {
  const branding = PLATFORM_BRANDING[game.platformKey] ||
    PLATFORM_BRANDING['epic'] || {
      name: game.platform,
      color: 0x10b981,
      iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@main/png/epic-games.png',
    };

  const cleanT = cleanTitle(game.title);
  const embed: DiscordEmbed = {
    title: cleanT,
    url: game.url,
    color: branding.color,
    author: {
      name: `${branding.name} · Free Game`,
      icon_url: branding.iconUrl,
    },
    footer: {
      text: `${feedTitle} · Weekly Free Games`,
    },
  };

  if (branding.iconUrl) {
    embed.thumbnail = { url: branding.iconUrl };
  }

  const { description: cleanDesc } = extractDescriptionAndLinks(game.description, STANDARD_DESC_LENGTH);
  if (cleanDesc) {
    embed.description = cleanDesc;
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: '🏷️ Platform',
      value: game.platform,
      inline: true,
    },
    {
      name: '💰 Value',
      value: game.worth || 'Free to Keep',
      inline: true,
    },
  ];

  if (game.endDate) {
    fields.push({
      name: '⏰ Availability',
      value: game.endDate,
      inline: true,
    });
  }

  if (game.url) {
    fields.push({
      name: '🔗 Claim Game',
      value: `[Claim Free on ${game.platform} ↗](${game.url})`,
      inline: true,
    });
  }

  embed.fields = fields;

  if (game.publishedAt) {
    embed.timestamp = normalizeTimestamp(game.publishedAt);
  }

  const primaryImage = normalizeImageUrl(game.imageUrl);
  if (primaryImage && isValidEmbedImageUrl(primaryImage)) {
    embed.image = { url: primaryImage.trim() };
  }

  return embed;
}

function normalizeTimestamp(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
