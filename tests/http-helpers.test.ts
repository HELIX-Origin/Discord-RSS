import { describe, expect, it } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  clearSessionCookie,
  COOKIE_NAME,
  parseCookies,
  readBodyJson,
  sendError,
  sendHtml,
  sendJson,
  sendText,
  setSessionCookie,
} from '../src/http/helpers.js';
import { Router } from '../src/http/router.js';

function mockResponse() {
  let status = 0;
  let body = '';
  const headers: Record<string, string | string[]> = {};
  const res = {
    writeHead(s: number, h: Record<string, string>) {
      status = s;
      Object.assign(headers, h);
    },
    end(chunk: unknown) {
      body += chunk ?? '';
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
  } as unknown as ServerResponse;
  return { res, status: () => status, headers: () => headers, text: () => body };
}

function mockRequest(body?: string, cookies?: string): IncomingMessage {
  return {
    headers: { cookie: cookies },
    [Symbol.asyncIterator]: async function* () {
      if (body) yield Buffer.from(body);
    },
  } as unknown as IncomingMessage;
}

describe('send helpers', () => {
  it('sendJson writes JSON with correct status and content-type', () => {
    const m = mockResponse();
    sendJson(m.res, 201, { ok: true });
    expect(m.status()).toBe(201);
    expect(m.headers()['content-type']).toContain('application/json');
    expect(JSON.parse(m.text())).toEqual({ ok: true });
  });

  it('sendText writes plain text', () => {
    const m = mockResponse();
    sendText(m.res, 200, 'hi');
    expect(m.status()).toBe(200);
    expect(m.headers()['content-type']).toContain('text/plain');
    expect(m.text()).toBe('hi');
  });

  it('sendHtml writes html', () => {
    const m = mockResponse();
    sendHtml(m.res, 200, '<p>x</p>');
    expect(m.headers()['content-type']).toContain('text/html');
    expect(m.text()).toBe('<p>x</p>');
  });

  it('sendError wraps message in JSON error object', () => {
    const m = mockResponse();
    sendError(m.res, 400, 'bad');
    expect(m.status()).toBe(400);
    expect(JSON.parse(m.text())).toEqual({ error: 'bad' });
  });
});

describe('readBodyJson', () => {
  it('parses a JSON body', async () => {
    const req = mockRequest('{"a":1}');
    expect(await readBodyJson(req)).toEqual({ a: 1 });
  });

  it('returns empty object for empty body', async () => {
    const req = mockRequest();
    expect(await readBodyJson(req)).toEqual({});
  });

  it('throws when body exceeds limit', async () => {
    const req = mockRequest('x'.repeat(200));
    await expect(readBodyJson(req, 100)).rejects.toThrow('too large');
  });

  it('throws on invalid JSON', async () => {
    const req = mockRequest('{not json}');
    await expect(readBodyJson(req)).rejects.toThrow('Invalid JSON body');
  });
});

describe('cookie helpers', () => {
  it('parseCookies splits a cookie header', () => {
    expect(parseCookies(mockRequest(undefined, 'a=1; b=2'))).toEqual({ a: '1', b: '2' });
    expect(parseCookies(mockRequest(undefined, '  drss_session=tok  '))).toEqual({ [COOKIE_NAME]: 'tok' });
    expect(parseCookies(mockRequest())).toEqual({});
  });

  it('setSessionCookie sets HttpOnly cookie with Max-Age', () => {
    const m = mockResponse();
    setSessionCookie(m.res, 'tok', 3600);
    const cookie = String(m.headers()['set-cookie']);
    expect(cookie).toContain(`${COOKIE_NAME}=tok`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=3600');
  });

  it('clearSessionCookie expires the cookie', () => {
    const m = mockResponse();
    clearSessionCookie(m.res);
    const cookie = String(m.headers()['set-cookie']);
    expect(cookie).toContain(`${COOKIE_NAME}=;`);
    expect(cookie).toContain('Max-Age=0');
  });
});

describe('Router', () => {
  it('matches routes and extracts params', () => {
    const router = new Router<string>();
    const handler = (req: IncomingMessage, res: ServerResponse, ctx: { params: Record<string, string> }) => ctx.params;
    router.add('GET', '/api/feeds/:id', handler);
    router.add('POST', '/api/feeds', handler);

    const found = router.find('GET', '/api/feeds/42');
    expect(found).not.toBeNull();
    expect(found!.params).toEqual({ id: '42' });

    expect(router.find('GET', '/api/feeds')).toBeNull();
    expect(router.find('POST', '/api/feeds')).not.toBeNull();
    expect(router.find('DELETE', '/api/feeds/42')).toBeNull();
  });
});