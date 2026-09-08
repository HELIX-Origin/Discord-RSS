import * as dotenv from 'dotenv';

dotenv.config();

export function loadWebhookUrls(serviceName: string): string[] {
  const urls: string[] = [];
  let index = 1;
  while (true) {
    const secretName = `${serviceName.toUpperCase()}_WEBHOOK_URL_${String(index).padStart(3, '0')}`;
    const url = process.env[secretName];
    if (!url) break;
    urls.push(url);
    index++;
  }
  return urls;
}
