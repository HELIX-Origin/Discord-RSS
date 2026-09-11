import http from 'node:http';
import https from 'node:https';
import { describe, expect, it } from 'vitest';
import { HttpsProxyServer } from '../../../src/dashboard/https-proxy.js';

describe('HttpsProxyServer', () => {
  it('proxies HTTPS traffic to local HTTP service and sets x-forwarded-proto', async () => {
    let receivedProto = '';
    let receivedHost = '';

    const localHttp = http.createServer((req, res) => {
      receivedProto = (req.headers['x-forwarded-proto'] as string) ?? '';
      receivedHost = (req.headers['x-forwarded-host'] as string) ?? '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', proto: receivedProto }));
    });

    await new Promise<void>((resolve) => localHttp.listen(0, '127.0.0.1', () => resolve()));
    const localPort = (localHttp.address() as { port: number }).port;

    const proxy = new HttpsProxyServer({
      proxyPort: 0, // ephemeral port
      targetPort: localPort,
      host: '127.0.0.1',
    });

    await proxy.start();

    try {
      const body = await new Promise<{ status: string; proto: string }>((resolve, reject) => {
        const req = https.request(
          {
            hostname: '127.0.0.1',
            port: proxy.port,
            path: '/health',
            method: 'GET',
            rejectUnauthorized: false,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(JSON.parse(data)));
          },
        );
        req.on('error', reject);
        req.end();
      });

      expect(body.status).toBe('ok');
      expect(receivedProto).toBe('https');
      expect(receivedHost).toBe(`127.0.0.1:${proxy.port}`);
    } finally {
      proxy.stop();
      await new Promise<void>((resolve) => localHttp.close(() => resolve()));
    }
  });
});
