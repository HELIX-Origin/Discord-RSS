import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export interface MockServer {
  url: string;
  close: () => void;
}

export function startMockServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<MockServer> {
  return new Promise((resolve, reject) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
    server.on('error', reject);
  });
}

export interface RssServer extends MockServer {
  setBody(body: string): void;
  setContentType(type: string): void;
  setStatus(status: number): void;
}

export function startRssServer(initialBody = '<?xml version="1.0"?><rss></rss>'): Promise<RssServer> {
  let body = initialBody;
  let contentType = 'application/rss+xml; charset=utf-8';
  let status = 200;

  return startMockServer((_req, res) => {
    res.writeHead(status, { 'content-type': contentType });
    res.end(body);
  }).then((server) => ({
    ...server,
    setBody(next) {
      body = next;
    },
    setContentType(next) {
      contentType = next;
    },
    setStatus(next) {
      status = next;
    },
  }));
}

export interface WebhookMock extends MockServer {
  deliveries: Array<{ headers: IncomingMessage['headers']; body: string }>;
}

export function startWebhookServer(): Promise<WebhookMock> {
  const deliveries: WebhookMock['deliveries'] = [];
  return startMockServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      deliveries.push({ headers: req.headers, body });
      res.writeHead(204);
      res.end();
    });
  }).then((server) => ({ ...server, deliveries }));
}
