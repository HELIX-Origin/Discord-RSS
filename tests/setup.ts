import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server.js';

beforeAll(() =>
  server.listen({
    onUnhandledRequest(req, print) {
      // Loopback requests are part of integration/smoke tests; let them through.
      if (req.url.startsWith('http://127.0.0.1') || req.url.startsWith('http://localhost')) {
        return;
      }
      print.error();
    },
  }),
);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
