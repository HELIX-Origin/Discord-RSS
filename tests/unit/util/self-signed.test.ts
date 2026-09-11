import https from 'node:https';
import { describe, expect, it } from 'vitest';
import { generateSelfSignedCertificate } from '../../../src/util/self-signed.js';

describe('generateSelfSignedCertificate', () => {
  it('generates a valid PEM private key and certificate', () => {
    const creds = generateSelfSignedCertificate('test.local');
    expect(creds.key).toContain('-----BEGIN PRIVATE KEY-----');
    expect(creds.key).toContain('-----END PRIVATE KEY-----');
    expect(creds.cert).toContain('-----BEGIN CERTIFICATE-----');
    expect(creds.cert).toContain('-----END CERTIFICATE-----');
  });

  it('can be used to launch an https server', async () => {
    const creds = generateSelfSignedCertificate('127.0.0.1');
    const server = https.createServer(creds, (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('tls ok');
    });

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });

    try {
      const address = server.address();
      expect(typeof address).toBe('object');
      const port = (address as { port: number }).port;

      const body = await new Promise<string>((resolve, reject) => {
        const req = https.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/',
            method: 'GET',
            rejectUnauthorized: false,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
          },
        );
        req.on('error', reject);
        req.end();
      });

      expect(body).toBe('tls ok');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('generates certificate with custom altNames', () => {
    const creds = generateSelfSignedCertificate('helix.local', ['mybot.test', '192.168.1.50']);
    expect(creds.cert).toContain('-----BEGIN CERTIFICATE-----');
    expect(creds.key).toContain('-----BEGIN PRIVATE KEY-----');
  });
});
