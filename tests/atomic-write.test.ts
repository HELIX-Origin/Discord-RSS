import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadState, saveState } from '../src/functions/atomic-write';
import { existsSync, unlinkSync } from 'fs';

describe('atomic-write', () => {
  const testPath = '.cache/test-state.json';

  beforeEach(() => {
    try { unlinkSync(testPath); } catch {}
    try { unlinkSync(testPath + '.tmp'); } catch {}
  });

  afterEach(() => {
    try { unlinkSync(testPath); } catch {}
    try { unlinkSync(testPath + '.tmp'); } catch {}
  });

  it('should save and load state atomically', () => {
    saveState(testPath, { status: 'online' });
    const state = loadState(testPath);
    expect(state.status).toBe('online');
  });

  it('should return empty object for missing file', () => {
    const state = loadState('.cache/nonexistent.json');
    expect(state).toEqual({});
  });
});
