import http from 'node:http';
import { describe, expect, it } from 'vitest';
import { KeepAlivePing } from '../../../src/util/keep-alive.js';

describe('KeepAlivePing', () => {
  it('successfully sends GET ping to target endpoint', async () => {
    let pingReceived = false;
    let userAgent = '';

    const server = http.createServer((req, res) => {
      pingReceived = true;
      userAgent = req.headers['user-agent'] ?? '';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    const pinger = new KeepAlivePing({
      targetUrl: `http://127.0.0.1:${port}/health`,
      intervalMs: 1000,
    });

    try {
      const ok = await pinger.pingNow();
      expect(ok).toBe(true);
      expect(pingReceived).toBe(true);
      expect(userAgent).toBe('HelixRSS-KeepAlive/1.0');
    } finally {
      pinger.stop();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('handles target server unreachable gracefully without throwing', async () => {
    const pinger = new KeepAlivePing({
      targetUrl: 'http://127.0.0.1:1/nonexistent',
      intervalMs: 1000,
    });

    const ok = await pinger.pingNow();
    expect(ok).toBe(false);
    pinger.stop();
  });
});
