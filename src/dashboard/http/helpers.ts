import type { IncomingMessage, ServerResponse } from 'node:http';

export interface JsonResponse {
  status: number;
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
}

export function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

export function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

export function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

export async function readBodyJson(req: IncomingMessage, limitBytes = 1024 * 1024): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > limitBytes) {
      throw new Error('Request body too large');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export const COOKIE_NAME = 'drss_session';

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

export function getRequestProtocol(req: IncomingMessage, defaultProto: 'http' | 'https' = 'http'): 'http' | 'https' {
  // Check TLS socket (direct HTTPS)
  if ('encrypted' in req.socket && Boolean((req.socket as { encrypted?: boolean }).encrypted)) {
    return 'https';
  }
  // Check standard reverse proxy headers
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    const proto = forwardedProto.split(',')[0]?.trim().toLowerCase();
    if (proto === 'https' || proto === 'http') return proto;
  }
  const forwardedSsl = req.headers['x-forwarded-ssl'];
  if (typeof forwardedSsl === 'string' && forwardedSsl.trim().toLowerCase() === 'on') {
    return 'https';
  }
  const frontEndHttps = req.headers['front-end-https'];
  if (typeof frontEndHttps === 'string' && frontEndHttps.trim().toLowerCase() === 'on') {
    return 'https';
  }
  return defaultProto;
}

export function getRequestHost(req: IncomingMessage, fallbackHost = '127.0.0.1:3131'): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  if (typeof forwardedHost === 'string') {
    return forwardedHost.split(',')[0]?.trim() || fallbackHost;
  }
  return req.headers.host || fallbackHost;
}

export function getRequestBaseUrl(req: IncomingMessage, publicBaseUrl?: string | null, fallbackHost?: string): string {
  if (publicBaseUrl) {
    return publicBaseUrl.replace(/\/+$/, '');
  }
  const proto = getRequestProtocol(req);
  const host = getRequestHost(req, fallbackHost);
  return `${proto}://${host}`;
}

export function isSecureConnection(req: IncomingMessage, publicBaseUrl?: string | null): boolean {
  if (publicBaseUrl && publicBaseUrl.startsWith('https://')) return true;
  return getRequestProtocol(req) === 'https';
}

export function setSessionCookie(
  res: ServerResponse,
  token: string,
  maxAgeSeconds: number,
  reqOrSecure?: IncomingMessage | boolean,
  publicBaseUrl?: string | null,
): void {
  let isSecure = false;
  if (typeof reqOrSecure === 'boolean') {
    isSecure = reqOrSecure;
  } else if (reqOrSecure && typeof reqOrSecure === 'object' && 'headers' in reqOrSecure) {
    isSecure = isSecureConnection(reqOrSecure, publicBaseUrl);
  }
  const secureFlag = isSecure ? '; Secure' : '';
  res.setHeader(
    'set-cookie',
    `${COOKIE_NAME}=${token}; HttpOnly${secureFlag}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`,
  );
}

export function clearSessionCookie(
  res: ServerResponse,
  reqOrSecure?: IncomingMessage | boolean,
  publicBaseUrl?: string | null,
): void {
  let isSecure = false;
  if (typeof reqOrSecure === 'boolean') {
    isSecure = reqOrSecure;
  } else if (reqOrSecure && typeof reqOrSecure === 'object' && 'headers' in reqOrSecure) {
    isSecure = isSecureConnection(reqOrSecure, publicBaseUrl);
  }
  const secureFlag = isSecure ? '; Secure' : '';
  res.setHeader('set-cookie', `${COOKIE_NAME}=; HttpOnly${secureFlag}; Path=/; Max-Age=0; SameSite=Lax`);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
