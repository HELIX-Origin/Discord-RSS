import { describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { parseCookies, readBodyJson } from '../../../src/http/helpers.js';

function makeReq(body: string, headers: Record<string, string> = {}): IncomingMessage {
  const chunks = body ? [Buffer.from(body)] : [];
  return {
    headers,
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    },
  } as unknown as IncomingMessage;
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
