import { describe, it, expect } from 'vitest';
import { loadWebhookUrls } from '../src/functions/webhook-loader';

describe('webhook-loader', () => {
  it('should load webhook URLs from environment using underscore naming', () => {
    process.env['DISCOHOOK_WEBHOOK_URL_001'] = 'https://discord.com/api/webhooks/test';

    const urls = loadWebhookUrls('DISCOHOOK');
    expect(urls).toContain('https://discord.com/api/webhooks/test');

    delete process.env['DISCOHOOK_WEBHOOK_URL_001'];
  });

  it('should return empty array when no webhook secrets configured', () => {
    const urls = loadWebhookUrls('UNKNOWN');
    expect(urls).toEqual([]);
  });
});
