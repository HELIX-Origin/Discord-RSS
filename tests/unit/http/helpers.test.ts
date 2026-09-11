import { describe, expect, it } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  clearSessionCookie,
  getRequestBaseUrl,
  getRequestHost,
  getRequestProtocol,
  isSecureConnection,
  parseCookies,
  readBodyJson,
  setSessionCookie,
} from '../../../src/dashboard/http/helpers.js';

function makeReq(
  body: string,
  headers: Record<string, string> = {},
  socket: { encrypted?: boolean } = {},
): IncomingMessage {
  const chunks = body ? [Buffer.from(body)] : [];
  return {
    headers,
    socket,
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    },
  } as unknown as IncomingMessage;
}

function makeRes(): { res: ServerResponse; headers: Record<string, string | string[]> } {
  const headers: Record<string, string | string[]> = {};
  const res = {
    setHeader(key: string, value: string | string[]) {
      headers[key.toLowerCase()] = value;
    },
  } as unknown as ServerResponse;
  return { res, headers };
}

describe('parseCookies', () => {
  it('parses cookie header', () => {
    const req = { headers: { cookie: 'a=1; b=2; c= 3 ' } } as unknown as IncomingMessage;
    expect(parseCookies(req)).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('returns empty object when no cookie header', () => {
    const req = { headers: {} } as unknown as IncomingMessage;
    expect(parseCookies(req)).toEqual({});
  });
});

describe('readBodyJson', () => {
  it('parses JSON body', async () => {
    const req = makeReq('{"hello":"world"}');
    const body = await readBodyJson(req);
    expect(body).toEqual({ hello: 'world' });
  });

  it('returns empty object for empty body', async () => {
    const req = makeReq('');
    const body = await readBodyJson(req);
    expect(body).toEqual({});
  });

  it('throws on invalid JSON', async () => {
    const req = makeReq('not-json');
    await expect(readBodyJson(req)).rejects.toThrow('Invalid JSON body');
  });
});

describe('getRequestProtocol', () => {
  it('defaults to http when no headers or TLS socket are present', () => {
    const req = makeReq('', { host: 'localhost:3434' });
    expect(getRequestProtocol(req)).toBe('http');
  });

  it('detects direct TLS / HTTPS socket', () => {
    const req = makeReq('', { host: 'localhost:3434' }, { encrypted: true });
    expect(getRequestProtocol(req)).toBe('https');
  });

  it('detects x-forwarded-proto header', () => {
    const req = makeReq('', { 'x-forwarded-proto': 'https' });
    expect(getRequestProtocol(req)).toBe('https');
  });

  it('handles comma-separated multi-proxy x-forwarded-proto', () => {
    const req = makeReq('', { 'x-forwarded-proto': 'https, http' });
    expect(getRequestProtocol(req)).toBe('https');
  });

  it('detects x-forwarded-ssl header', () => {
    const req = makeReq('', { 'x-forwarded-ssl': 'on' });
    expect(getRequestProtocol(req)).toBe('https');
  });

  it('detects front-end-https header', () => {
    const req = makeReq('', { 'front-end-https': 'on' });
    expect(getRequestProtocol(req)).toBe('https');
  });
});

describe('getRequestHost', () => {
  it('uses host header when present', () => {
    const req = makeReq('', { host: 'example.com:3434' });
    expect(getRequestHost(req)).toBe('example.com:3434');
  });

  it('prioritizes x-forwarded-host header', () => {
    const req = makeReq('', { host: 'internal-ip:3434', 'x-forwarded-host': 'rss.domain.com' });
    expect(getRequestHost(req)).toBe('rss.domain.com');
  });

  it('falls back to default host when no headers provided', () => {
    const req = makeReq('', {});
    expect(getRequestHost(req, '127.0.0.1:3434')).toBe('127.0.0.1:3434');
  });
});

describe('getRequestBaseUrl', () => {
  it('returns publicBaseUrl when configured', () => {
    const req = makeReq('', { host: 'internal:3434' });
    expect(getRequestBaseUrl(req, 'https://feeds.example.com/')).toBe('https://feeds.example.com');
  });

  it('constructs dynamic base URL from request protocol and host for HTTP', () => {
    const req = makeReq('', { host: '192.168.1.100:3434' });
    expect(getRequestBaseUrl(req)).toBe('http://192.168.1.100:3434');
  });

  it('constructs dynamic base URL from request protocol and host for HTTPS', () => {
    const req = makeReq('', { host: 'secure.helix.local', 'x-forwarded-proto': 'https' });
    expect(getRequestBaseUrl(req)).toBe('https://secure.helix.local');
  });
});

describe('isSecureConnection', () => {
  it('returns true if publicBaseUrl is https', () => {
    const req = makeReq('', { host: 'localhost:3434' });
    expect(isSecureConnection(req, 'https://feeds.example.com')).toBe(true);
  });

  it('returns true if request is over HTTPS proxy', () => {
    const req = makeReq('', { 'x-forwarded-proto': 'https' });
    expect(isSecureConnection(req)).toBe(true);
  });

  it('returns false for plain HTTP', () => {
    const req = makeReq('', { host: 'localhost:3434' });
    expect(isSecureConnection(req)).toBe(false);
  });
});

describe('setSessionCookie & clearSessionCookie', () => {
  it('omits Secure flag when running on plain HTTP', () => {
    const { res, headers } = makeRes();
    const req = makeReq('', { host: '192.168.1.50:3434' });
    setSessionCookie(res, 'test-token', 3600, req);
    expect(headers['set-cookie']).toBe('drss_session=test-token; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax');
  });

  it('includes Secure flag when running on HTTPS', () => {
    const { res, headers } = makeRes();
    const req = makeReq('', { 'x-forwarded-proto': 'https' });
    setSessionCookie(res, 'test-token', 3600, req);
    expect(headers['set-cookie']).toBe('drss_session=test-token; HttpOnly; Secure; Path=/; Max-Age=3600; SameSite=Lax');
  });

  it('clears session cookie with matching Secure flag on HTTP', () => {
    const { res, headers } = makeRes();
    const req = makeReq('', { host: 'localhost:3434' });
    clearSessionCookie(res, req);
    expect(headers['set-cookie']).toBe('drss_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  });

  it('clears session cookie with Secure flag on HTTPS', () => {
    const { res, headers } = makeRes();
    const req = makeReq('', { 'x-forwarded-proto': 'https' });
    clearSessionCookie(res, req);
    expect(headers['set-cookie']).toBe('drss_session=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax');
  });
});
