import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https, { type Server as HttpsServer } from 'node:https';
import net, { type Socket } from 'node:net';
import { generateSelfSignedCertificate, type GeneratedTlsCertificate } from '../util/self-signed.js';
import { createLogger, type Logger } from '../util/logger.js';

export interface HttpsProxyOptions {
  proxyPort: number;
  targetPort: number;
  host?: string;
  tlsCredentials?: GeneratedTlsCertificate | null;
  logger?: Logger;
}

export class HttpsProxyServer {
  private server: HttpsServer | null = null;
  private isStarted = false;
  private readonly logger: Logger;
  readonly proxyPort: number;
  readonly targetPort: number;
  readonly host: string;
  private actualPort: number;

  constructor(options: HttpsProxyOptions) {
    this.proxyPort = options.proxyPort;
    this.targetPort = options.targetPort;
    this.actualPort = options.proxyPort;
    this.host = options.host ?? '0.0.0.0';
    this.logger = options.logger ?? createLogger('https-proxy');
  }

  get port(): number {
    return this.actualPort;
  }

  async start(tlsCredentials?: GeneratedTlsCertificate | null): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    // Use provided credentials or generate in-memory self-signed certificate
    const tls = tlsCredentials ?? generateSelfSignedCertificate();

    this.server = https.createServer(tls, (req: IncomingMessage, res: ServerResponse) => {
      this.handleRequest(req, res);
    });

    this.server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
      this.handleUpgrade(req, socket, head);
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        this.logger.warn(`HTTPS Proxy port ${this.proxyPort} is already in use; running without HTTPS proxy`);
      } else {
        this.logger.error('HTTPS Proxy server error', { err: err.message });
      }
    });

    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();

      const onListening = () => {
        this.server?.removeListener('error', onError);
        const addr = this.server?.address();
        if (typeof addr === 'object' && addr) {
          this.actualPort = addr.port;
        }
        this.logger.info(
          `HTTPS Proxy listening on https://${this.host}:${this.actualPort} -> target port ${this.targetPort}`,
        );
        resolve();
      };

      const onError = (err: NodeJS.ErrnoException) => {
        this.server?.removeListener('listening', onListening);
        this.logger.warn(
          `HTTPS Proxy could not bind to port ${this.proxyPort} (${err.message}). Continuing in HTTP mode.`,
        );
        resolve(); // Degrade gracefully without failing entire application boot
      };

      this.server.once('error', onError);
      this.server.once('listening', onListening);
      this.server.listen(this.proxyPort, this.host);
    });
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const headers = { ...req.headers };
    headers['x-forwarded-proto'] = 'https';
    headers['x-forwarded-port'] = String(this.actualPort);
    if (req.headers.host) headers['x-forwarded-host'] = req.headers.host;
    const remoteIp = req.socket.remoteAddress;
    if (remoteIp) {
      headers['x-forwarded-for'] = headers['x-forwarded-for'] ? `${headers['x-forwarded-for']}, ${remoteIp}` : remoteIp;
    }

    const proxyReq = http.request(
      {
        host: '127.0.0.1',
        port: this.targetPort,
        path: req.url,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (err) => {
      this.logger.error('Proxy request to local HTTP service failed', { err: err.message });
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Failed to connect to local service');
      }
    });

    req.pipe(proxyReq);
  }

  private handleUpgrade(req: IncomingMessage, clientSocket: Socket, head: Buffer): void {
    const targetSocket = net.connect(this.targetPort, '127.0.0.1', () => {
      const headers = Object.entries(req.headers)
        .map(([k, v]) => (Array.isArray(v) ? v.map((val) => `${k}: ${val}`).join('\r\n') : `${k}: ${v}`))
        .join('\r\n');

      targetSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
      if (head.length > 0) targetSocket.write(head);

      clientSocket.pipe(targetSocket);
      targetSocket.pipe(clientSocket);
    });

    targetSocket.on('error', (err) => {
      this.logger.error('Proxy WebSocket tunnel failed', { err: err.message });
      clientSocket.destroy();
    });

    clientSocket.on('error', () => {
      targetSocket.destroy();
    });
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.logger.info('HTTPS Proxy stopped');
  }
}
