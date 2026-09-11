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
  it('builds an embed with clean title and description', () => {
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

  it('attaches primary image when imageUrl is provided', () => {
    const embed = feedEmbed({
      title: 'Photo Post',
      url: 'https://example.com/photo',
      description: 'A great photo',
      feedTitle: 'Feed',
      color: 0x06b6d4,
      imageUrl: 'https://example.com/hero.jpg',
    });
    expect(embed.image).toEqual({ url: 'https://example.com/hero.jpg' });
  });

  it('extracts primary image from HTML description when imageUrl is not provided', () => {
    const embed = feedEmbed({
      title: 'Article with embedded image',
      url: 'https://example.com/article',
      description: '<p>Some text</p><img src="https://example.com/cover.png" alt="cover"/>',
      feedTitle: 'Feed',
      color: 0x06b6d4,
    });
    expect(embed.image).toEqual({ url: 'https://example.com/cover.png' });
  });

  it('cleans up HTML entities and whitespace in titles', () => {
    const embed = feedEmbed({
      title: '&lt;Breaking&gt; Company&#39;s Q3 Revenue Up &amp; Profitable',
      url: 'https://example.com/news',
      feedTitle: 'Feed',
      color: 0x06b6d4,
    });
    expect(embed.title).toBe("<Breaking> Company's Q3 Revenue Up & Profitable");
  });

  it('formats HTML links and raw URLs into easily readable markdown links', () => {
    const rawDescription = `
      <p>Check out our <a href="https://example.com/blog/2026/09/update">Read Announcement</a> for details.</p>
      <p>Or visit the repo: <a href="https://github.com/HELIX-Origin/HELIX-RSS">https://github.com/HELIX-Origin/HELIX-RSS</a>.</p>
      <p>Also see raw link: https://news.ycombinator.com/item?id=12345 in discussion.</p>
    `;
    const embed = feedEmbed({
      title: 'Link Test',
      url: 'https://example.com/links',
      description: rawDescription,
      feedTitle: 'Feed',
      color: 0x06b6d4,
    });

    // Meaningful anchor text preserved as markdown link
    expect(embed.description).toContain('[Read Announcement](https://example.com/blog/2026/09/update)');
    // URL-as-anchor formatted to clean label
    expect(embed.description).toContain(
      '[github.com/HELIX-Origin/HELIX-RSS](https://github.com/HELIX-Origin/HELIX-RSS)',
    );
    // Standalone raw URL formatted to clean readable label
    expect(embed.description).toContain('[news.ycombinator.com/item](https://news.ycombinator.com/item?id=12345)');
  });
});
