import { FetchError } from '../feed/fetch.js';

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
  let lastStatus: number | null = null;
  let lastDetail = '';
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
        headers: { 'content-type': 'application/json', 'user-agent': 'DiscordRSS/0.1 (+https://github.com/HELIX-Origin/Site-Feed-Discord)' },
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

    lastStatus = res.status;

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status, error: null, attempts, rateLimited: false };
    }

    let detail = '';
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

export function feedEmbed(args: {
  title: string;
  url: string;
  description?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  feedTitle: string;
  color: number;
}): Embed {
  const { title, url, description, author, publishedAt, feedTitle, color } = args;
  const embed: Embed = { title, url, color };

  if (description) {
    embed.description = description.length > 2048 ? `${description.slice(0, 2045)}...` : description;
  }
  if (author) {
    embed.author = { name: author.slice(0, 256) };
  }
  embed.footer = { text: feedTitle };
  if (publishedAt) {
    embed.timestamp = normalizeTimestamp(publishedAt);
  }
  return embed;
}

function normalizeTimestamp(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export { FetchError };