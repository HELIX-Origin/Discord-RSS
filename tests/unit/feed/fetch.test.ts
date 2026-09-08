import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { fetchRaw, FetchError, isCloudflareChallenge, isFeedXml } from '../../../src/feed/fetch.js';

describe('fetchRaw', () => {
  const server = createServer();
  let url = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        url = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('fetches text and status', async () => {
    server.removeAllListeners('request');
    server.on('request', (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('hello');
    });
    const result = await fetchRaw(url, { timeoutMs: 5_000 });
    expect(result.status).toBe(200);
    expect(result.text).toBe('hello');
  });

  it('follows redirects', async () => {
    server.removeAllListeners('request');
    server.on('request', (req, res) => {
      if (req.url === '/redirect') {
        res.writeHead(302, { location: '/target' });
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('target');
      }
    });
    const result = await fetchRaw(`${url}/redirect`, { timeoutMs: 5_000 });
    expect(result.status).toBe(200);
    expect(result.text).toBe('target');
  });

  it('detects Cloudflare challenge', async () => {
    server.removeAllListeners('request');
    server.on('request', (_req, res) => {
      res.writeHead(403, { 'content-type': 'text/html', server: 'cloudflare' });
      res.end('challenge');
    });
    const result = await fetchRaw(url, { timeoutMs: 5_000 });
    expect(result.challenged).toBe(true);
  });

  it('throws FetchError on timeout', async () => {
    server.removeAllListeners('request');
    server.on('request', (_req, res) => {
      setTimeout(() => res.end('late'), 10_000);
    });
    await expect(fetchRaw(url, { timeoutMs: 50 })).rejects.toBeInstanceOf(FetchError);
  });
});

describe('helpers', () => {
  it('detects Cloudflare challenge by content-type and server', () => {
    expect(isCloudflareChallenge('text/html; charset=utf-8', 'cloudflare')).toBe(true);
    expect(isCloudflareChallenge('text/html', 'nginx')).toBe(false);
  });

  it('detects feed XML', async () => {
    const result = {
      text: '<?xml version="1.0"?><rss></rss>',
    } as Awaited<ReturnType<typeof fetchRaw>>;
    expect(await isFeedXml(result)).toBe(true);
  });
});
