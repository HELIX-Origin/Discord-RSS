import https from 'node:https';
import { describe, expect, it, vi } from 'vitest';
import { loadTlsCredentials, createHelixRssServer } from '../../../src/dashboard/server.js';
import { buildAppDeps } from '../../helpers/app-deps.js';

describe('loadTlsCredentials', () => {
  it('returns null when either key or cert is missing', () => {
    expect(loadTlsCredentials(null, null)).toBeNull();
    expect(loadTlsCredentials('some-key', null)).toBeNull();
    expect(loadTlsCredentials(null, 'some-cert')).toBeNull();
  });

  it('returns raw PEM strings when valid strings are passed', () => {
    const creds = loadTlsCredentials('MOCK_KEY_CONTENT', 'MOCK_CERT_CONTENT');
    expect(creds).toEqual({
      key: 'MOCK_KEY_CONTENT',
      cert: 'MOCK_CERT_CONTENT',
    });
  });
});

describe('createHelixRssServer with HTTP and HTTPS', () => {
  it('creates an HTTP server by default', async () => {
    const ctx = await buildAppDeps({
      config: { sslKey: null, sslCert: null },
    });
    const server = createHelixRssServer(ctx.deps);
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe('function');
    await ctx.cleanup();
  });

  it('creates an HTTPS server when sslKey and sslCert are provided', async () => {
    const spy = vi.spyOn(https, 'createServer').mockReturnValueOnce({
      listen: vi.fn(),
      on: vi.fn(),
      close: vi.fn(),
    } as unknown as https.Server);

    const ctx = await buildAppDeps({
      config: { sslKey: 'FAKE_KEY', sslCert: 'FAKE_CERT' },
    });
    const server = createHelixRssServer(ctx.deps);
    expect(server).toBeDefined();
    expect(spy).toHaveBeenCalledWith({ key: 'FAKE_KEY', cert: 'FAKE_CERT' }, expect.any(Function));
    await ctx.cleanup();
  });
});
