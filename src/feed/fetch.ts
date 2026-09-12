import { performance } from 'node:perf_hooks';

export class FetchError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.retryable = retryable;
  }
}

export interface FetchResult {
  url: string;
  status: number;
  contentType: string | null;
  body: Uint8Array;
  text: string;
  durationMs: number;
  challenged: boolean;
}

export interface HttpFetcherOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  userAgent?: string;
  maxBytes?: number;
}

const defaultRepoUrl =
  process.env['REPO_URL']?.trim() ||
  process.env['GITHUB_REPO']?.trim() ||
  process.env['REPOSITORY_URL']?.trim() ||
  process.env['PROJECT_URL']?.trim() ||
  '';

export const DEFAULT_USER_AGENT =
  process.env['FEED_USER_AGENT']?.trim() ||
  process.env['USER_AGENT']?.trim() ||
  (defaultRepoUrl ? `HelixRSS/0.1 (+${defaultRepoUrl})` : 'HelixRSS/0.1');

export async function fetchRaw(url: string, options: HttpFetcherOptions = {}): Promise<FetchResult> {
  const { timeoutMs = 15_000, maxRedirects = 5, userAgent = DEFAULT_USER_AGENT, maxBytes = 10 * 1024 * 1024 } = options;

  const start = performance.now();
  let currentUrl = url;
  let redirects = 0;

  const finish = (status: number, contentType: string | null, body: Uint8Array, challenged: boolean): FetchResult => {
    const text = new TextDecoder().decode(body);
    return {
      url: currentUrl,
      status,
      contentType,
      body,
      text,
      durationMs: Math.round(performance.now() - start),
      challenged,
    };
  };

  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': userAgent,
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        },
      });

      if (res.status >= 300 && res.status < 400 && redirects < maxRedirects) {
        const location = res.headers.get('location');
        if (location) {
          currentUrl = new URL(location, currentUrl).toString();
          redirects += 1;
          continue;
        }
      }

      const contentType = res.headers.get('content-type');
      const challenged = isCloudflareChallenge(contentType, res.headers.get('server'));

      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            throw new FetchError(`Response exceeded ${maxBytes} bytes`, res.status, false);
          }
          chunks.push(value);
        }
      }
      const body = Buffer.concat(chunks);

      return finish(res.status, contentType, body, challenged);
    } catch (err) {
      if (err instanceof FetchError) throw err;
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new FetchError(
        aborted ? `Request timed out after ${timeoutMs}ms` : `Request failed: ${String(err)}`,
        null,
        aborted,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

export function isCloudflareChallenge(contentType: string | null, server: string | null): boolean {
  if (contentType && contentType.includes('text/html')) {
    if (server === 'cloudflare') return true;
  }
  return false;
}

export function isFeedXml(result: FetchResult): boolean {
  const head = result.text.slice(0, 1024).toLowerCase();
  return head.includes('<rss') || head.includes('<feed') || head.includes('<rdf');
}
