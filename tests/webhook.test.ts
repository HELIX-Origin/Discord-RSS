import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { feedEmbed, sendWebhook, type WebhookMessage } from '../src/webhook/discord.js';
import { server } from './mocks/server.js';

describe('sendWebhook', () => {
  const msg: WebhookMessage = { content: 'Hello' };

  it('returns ok on 204 success', async () => {
    server.use(
      http.post('https://discord.com/api/webhooks/123/token', () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(1);
  });

  it('retries on 500 then succeeds', async () => {
    let calls = 0;
    server.use(
      http.post('https://discord.com/api/webhooks/123/token', () => {
        calls += 1;
        return calls === 1 ? new HttpResponse(null, { status: 500 }) : new HttpResponse(null, { status: 204 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('retries on 429 respecting Retry-After then succeeds', async () => {
    let calls = 0;
    server.use(
      http.post('https://discord.com/api/webhooks/123/token', async () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ retry_after: 0.05, message: 'rate limited' }, { status: 429 });
        }
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('fails after max attempts on repeated 500s', async () => {
    server.use(
      http.post('https://discord.com/api/webhooks/123/token', () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.attempts).toBe(5);
  }, 25_000);

  it('fails non-retryable 400 immediately', async () => {
    server.use(
      http.post('https://discord.com/api/webhooks/123/token', () => {
        return HttpResponse.json({ message: 'Bad request' }, { status: 400 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('Bad request');
    expect(result.attempts).toBe(1);
  });

  it('redacts token in error output', async () => {
    server.use(
      http.post('https://discord.com/api/webhooks/123/secret-token', () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/123/secret-token', msg);
    expect(result.error).toContain('/123/••••••');
    expect(result.error).not.toContain('secret-token');
  });
});

describe('feedEmbed', () => {
  it('builds a Discord embed and truncates long description', () => {
    const embed = feedEmbed({
      title: 'T',
      url: 'https://x',
      description: 'x'.repeat(3000),
      author: 'Author',
      publishedAt: '2026-01-01T00:00:00Z',
      feedTitle: 'Feed',
      color: 0xff0000,
    });
    expect(embed.title).toBe('T');
    expect(embed.url).toBe('https://x');
    expect(embed.description).toHaveLength(2048);
    expect(embed.author).toEqual({ name: 'Author' });
    expect(embed.footer?.text).toBe('Feed');
    expect(embed.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('omits optional fields when not provided', () => {
    const embed = feedEmbed({ title: 'T', url: 'https://x', feedTitle: 'F', color: 0 });
    expect(embed.description).toBeUndefined();
    expect(embed.author).toBeUndefined();
  });
});