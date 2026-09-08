import { loadWebhookUrls } from '../functions/webhook-loader';

export function getWebhookUrls(): string[] {
  return loadWebhookUrls('DISCOHOOK').concat(
    loadWebhookUrls('DISCORD'),
    loadWebhookUrls('SITE_STATUS')
  );
}
