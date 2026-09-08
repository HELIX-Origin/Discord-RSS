import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server.js';

// These imports exercise the compiled `dist/` output. They are intentionally
// kept separate from the src-backed unit tests so the suite covers both the
// source files (for debugging) and the built artifact (for release sanity).

describe('dist build sanity', () => {
  it('parseFeed works from dist', async () => {
    const { parseFeed } = await import('../dist/feed/parser.js');
    const feed = parseFeed(
      '<rss><channel><title>C</title><item><title>T</title><link>https://x</link></item></channel></rss>',
    );
    expect(feed.title).toBe('C');
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0].title).toBe('T');
  });

  it('parseHtml + scrapeItems work from dist', async () => {
    const { parseHtml } = await import('../dist/feed/html.js');
    const { scrapeItems } = await import('../dist/feed/scraper.js');
    const root = parseHtml('<ul><li class="item"><a class="title" href="/1">One</a></li></ul>');
    const items = scrapeItems(root, { itemSelector: 'li.item', titleSelector: 'a.title', linkSelector: 'a.title' });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('One');
  });

  it('passwordService works from dist', async () => {
    const { passwordService } = await import('../dist/auth/password.js');
    const stored = passwordService.hash('secret');
    expect(passwordService.verify('secret', stored)).toBe(true);
    expect(passwordService.verify('wrong', stored)).toBe(false);
  });

  it('sendWebhook works from dist', async () => {
    server.use(
      http.post('https://discord.com/api/webhooks/999/token', () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { sendWebhook } = await import('../dist/webhook/discord.js');
    const result = await sendWebhook('https://discord.com/api/webhooks/999/token', { content: 'hi' });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
  });
});