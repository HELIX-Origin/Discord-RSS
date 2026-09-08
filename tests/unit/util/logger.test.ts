import { describe, expect, it, vi } from 'vitest';
import { Logger, createLogger } from '../../../src/util/logger.js';

describe('logger', () => {
  it('createLogger returns a Logger instance', () => {
    const logger = createLogger('test', 'debug');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('respects level filtering', () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg));

    const logger = createLogger('test', 'warn');
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(logs.length).toBe(0);

    spy.mockRestore();
  });

  it('emits JSON with source, level, message and context', () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((msg: string) => errors.push(msg));

    const logger = createLogger('test', 'error');
    logger.error('boom', { feedId: 1 });

    expect(errors.length).toBe(1);
    const parsed = JSON.parse(errors[0]!);
    expect(parsed.level).toBe('error');
    expect(parsed.source).toBe('test');
    expect(parsed.message).toBe('boom');
    expect(parsed.context).toEqual({ feedId: 1 });

    spy.mockRestore();
  });
});
