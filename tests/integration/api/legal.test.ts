import { describe, expect, it } from 'vitest';
import { createHelixRssServer } from '../../../src/dashboard/server.js';
import { buildAppDeps } from '../../helpers/app-deps.js';

describe('Legal & Policy Routes', () => {
  it('serves /privacy with HTML rendered Privacy Policy', async () => {
    const { deps, cleanup } = await buildAppDeps();
    const server = createHelixRssServer(deps);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/privacy`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const html = await res.text();
      expect(html).toContain('Privacy Policy');
      expect(html).toContain('Zero Telemetry');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await cleanup();
    }
  });

  it('serves /tos with HTML rendered Terms of Service', async () => {
    const { deps, cleanup } = await buildAppDeps();
    const server = createHelixRssServer(deps);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/tos`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const html = await res.text();
      expect(html).toContain('Terms of Service');
      expect(html).toContain('Acceptance of Terms');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await cleanup();
    }
  });
});
