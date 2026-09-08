import { describe, expect, it } from 'vitest';
import { Router } from '../../../src/http/router.js';

describe('Router', () => {
  it('matches static routes', () => {
    const router = new Router<void>();
    router.add('GET', '/health', () => 'ok');
    const found = router.find('GET', '/health');
    expect(found).not.toBeNull();
    expect(found?.params).toEqual({});
  });

  it('extracts params', () => {
    const router = new Router<void>();
    router.add('GET', '/feeds/:id', () => 'feed');
    const found = router.find('GET', '/feeds/42');
    expect(found?.params).toEqual({ id: '42' });
  });

  it('does not match wrong method', () => {
    const router = new Router<void>();
    router.add('GET', '/health', () => 'ok');
    expect(router.find('POST', '/health')).toBeNull();
  });

  it('does not match wrong length', () => {
    const router = new Router<void>();
    router.add('GET', '/a/b', () => 'ok');
    expect(router.find('GET', '/a')).toBeNull();
  });
});
