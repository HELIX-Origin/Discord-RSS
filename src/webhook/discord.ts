import { FetchError } from '../feed/fetch.js';
import { decodeHtmlEntities, extractImageFromHtml } from '../feed/parser.js';

export interface EmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedFooter {
  text: string;
  icon_url?: string;
}

export interface EmbedImage {
  url: string;
}

export interface EmbedThumbnail {
  url: string;
}

export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: EmbedAuthor;
  fields?: EmbedField[];
  footer?: EmbedFooter;
  image?: EmbedImage;
  thumbnail?: EmbedThumbnail;
  timestamp?: string;
}

export interface WebhookMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: Embed[];
}

export interface SendResult {
  ok: boolean;
  status: number | null;
  error: string | null;
  attempts: number;
  rateLimited: boolean;
}

const MAX_ATTEMPTS = 5;
const RETRY_AFTER_CAP_MS = 15_000;

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length >= 1) {
      const redacted = segs.map((s, i) => (i === segs.length - 1 ? '••••••' : s)).join('/');
      return `${u.origin}/${redacted}${u.search}${u.hash}`;
    }
    return url;
  } catch {
    return 'invalid-url';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWebhook(url: string, message: WebhookMessage, timeoutMs = 15_000): Promise<SendResult> {
  let attempts = 0;
  let lastRateLimited = false;

  for (;;) {
    attempts += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'user-agent': 'HelixRSS/0.1 (+https://github.com/HELIX-Origin/HELIX-RSS)',
        },
        body: JSON.stringify(message),
      });
    } catch (err) {
      if (err instanceof FetchError) {
        return { ok: false, status: err.status, error: err.message, attempts, rateLimited: false };
      }
      const aborted = err instanceof Error && err.name === 'AbortError';
      const error = aborted ? `Webhook POST timed out after ${timeoutMs}ms` : `Webhook POST failed: ${String(err)}`;
      return { ok: false, status: null, error, attempts, rateLimited: false };
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status, error: null, attempts, rateLimited: false };
    }

    let detail: string;
    try {
      const body = (await res.json()) as { message?: string; retry_after?: number };
      detail = body.message ?? '';
      if (res.status === 429 && typeof body.retry_after === 'number') {
        lastRateLimited = true;
        const waitMs = Math.min(Math.ceil(body.retry_after * 1000), RETRY_AFTER_CAP_MS);
        if (attempts < MAX_ATTEMPTS) {
          await sleep(waitMs);
          continue;
        }
      }
    } catch {
      detail = '';
    }

    const retryable = res.status >= 500;
    if (retryable && attempts < MAX_ATTEMPTS) {
      await sleep(Math.min(1000 * 2 ** (attempts - 1), RETRY_AFTER_CAP_MS));
      continue;
    }

    const messageText = detail ? ` ${detail}` : '';
    return {
      ok: false,
      status: res.status,
      error: `Webhook POST failed (${res.status}):${messageText} [${redactUrl(url)}]${retryable ? ' (retryable)' : ''}`,
      attempts,
      rateLimited: lastRateLimited,
    };
  }
}

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
}): Embed {
  const { title, url, description, author, publishedAt, feedTitle, color, imageUrl } = args;
  const cleanT = cleanTitle(title);
  const cleanDesc = formatMessageDescription(description ?? null);

  const embed: Embed = { title: cleanT, url, color };

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

export { FetchError };
