import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { sendWebhook, feedEmbed } from '../../../src/webhook/discord.js';
import { mswServer } from '../../mocks/msw-server.js';

describe('sendWebhook', () => {
  it('succeeds on 204', async () => {
    const result = await sendWebhook('https://discord.com/api/webhooks/1/token', { content: 'hi' });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
  });

  it('retries on 500 then succeeds', async () => {
    let calls = 0;
    mswServer.use(
      http.post(/https:\/\/discord\.com\/api\/webhooks\/.+/, () => {
        calls += 1;
        return calls === 1 ? new HttpResponse(null, { status: 500 }) : new HttpResponse(null, { status: 204 });
      }),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/1/token', { content: 'hi' });
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('fails after max attempts on repeated 500s', async () => {
    mswServer.use(
      http.post(/https:\/\/discord\.com\/api\/webhooks\/.+/, () => new HttpResponse(null, { status: 500 })),
    );
    const result = await sendWebhook('https://discord.com/api/webhooks/1/token', { content: 'hi' });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(5);
  });
});

describe('feedEmbed', () => {
  it('builds an embed', () => {
    const embed = feedEmbed({
      title: 'Title',
      url: 'https://example.com',
      description: 'Desc',
      author: 'Author',
      publishedAt: '2024-01-01T00:00:00Z',
      feedTitle: 'Feed',
      color: 0x06b6d4,
    });
    expect(embed.title).toBe('Title');
    expect(embed.url).toBe('https://example.com');
    expect(embed.footer?.text).toBe('Feed');
  });
});
