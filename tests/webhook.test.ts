import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { feedEmbed, sendWebhook, type WebhookMessage } from '../src/webhook/discord.js';

describe('sendWebhook', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  const msg: WebhookMessage = { content: 'Hello' };

  it('returns ok on 204 success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 204, json: async () => ({}) } as Response);
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(1);
  });

  it('retries on 500 then succeeds', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 500, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ status: 204, json: async () => ({}) } as Response);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const result = sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    await vi.runAllTimersAsync();
    const awaited = await result;
    expect(awaited.ok).toBe(true);
    expect(awaited.attempts).toBe(2);
  });

  it('retries on 429 respecting Retry-After then succeeds', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, json: async () => ({ retry_after: 0.05 }) } as Response)
      .mockResolvedValueOnce({ status: 204, json: async () => ({}) } as Response);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const result = sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    await vi.runAllTimersAsync();
    const awaited = await result;
    expect(awaited.ok).toBe(true);
    expect(awaited.attempts).toBe(2);
  });

  it('fails after max attempts on repeated 500s', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 500, json: async () => ({}) } as Response);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const result = sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    await vi.runAllTimersAsync();
    const awaited = await result;
    expect(awaited.ok).toBe(false);
    expect(awaited.status).toBe(500);
    expect(awaited.attempts).toBe(5);
  });

  it('fails non-retryable 400 immediately', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 400, json: async () => ({ message: 'Bad request' }) } as Response);
    const result = await sendWebhook('https://discord.com/api/webhooks/123/token', msg);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('Bad request');
    expect(result.attempts).toBe(1);
  });

  it('redacts token in error output', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 404, json: async () => ({}) } as Response);
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