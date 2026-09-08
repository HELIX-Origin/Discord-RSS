import type { Server } from 'node:http';
import { createDiscordRssServer } from '../../src/server.js';
import type { AppDeps } from '../../src/app.js';

export interface TestAppServer {
  url: string;
  stop: () => Promise<void>;
}

export async function startAppServer(deps: AppDeps): Promise<TestAppServer> {
  const server = createDiscordRssServer(deps);
  return new Promise((resolve, reject) => {
    server.listen(deps.config.port, deps.config.host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : deps.config.port;
      resolve({
        url: `http://${deps.config.host}:${port}`,
        stop: () => stopServer(server),
      });
    });
    server.on('error', reject);
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}
