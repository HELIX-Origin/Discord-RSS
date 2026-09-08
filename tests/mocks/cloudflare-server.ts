import { startMockServer } from './rss-server.js';

export interface CloudflareMock extends Awaited<ReturnType<typeof startMockServer>> {
  setResponse(response: { status: number; body: string; contentType?: string }): void;
}

export async function startCloudflareMock(): Promise<CloudflareMock> {
  let response: { status: number; body: string; contentType: string } = {
    status: 200,
    body: '<html><body>Cloudflare rendered</body></html>',
    contentType: 'text/html; charset=utf-8',
  };

  const server = await startMockServer((_req, res) => {
    res.writeHead(response.status, { 'content-type': response.contentType });
    res.end(response.body);
  });

  return {
    ...server,
    setResponse(next) {
      response = { contentType: 'text/html; charset=utf-8', ...next };
    },
  };
}
