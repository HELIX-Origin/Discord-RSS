import { describe, expect, it } from 'vitest';
import { withRedisCoordinator } from '../../helpers/redis.js';

describe('RedisCoordinator', () => {
  it('marks and checks sent entries', async () => {
    await withRedisCoordinator(async ({ coordinator }) => {
      expect(await coordinator.isEntrySent(1, 'a')).toBe(false);
      await coordinator.markEntrySent(1, 'a');
      expect(await coordinator.isEntrySent(1, 'a')).toBe(true);
    });
  });

  it('scopes sets by feed id', async () => {
    await withRedisCoordinator(async ({ coordinator }) => {
      await coordinator.markEntrySent(1, 'a');
      expect(await coordinator.isEntrySent(2, 'a')).toBe(false);
    });
  });

  it('acquires and releases locks', async () => {
    await withRedisCoordinator(async ({ coordinator }) => {
      expect(await coordinator.acquireLock('feed:1', 1_000)).toBe(true);
      expect(await coordinator.acquireLock('feed:1', 1_000)).toBe(false);
      await coordinator.releaseLock('feed:1');
      expect(await coordinator.acquireLock('feed:1', 1_000)).toBe(true);
    });
  });

  it('exposes instance id', async () => {
    await withRedisCoordinator(async ({ coordinator }) => {
      expect(coordinator.instanceId).toMatch(/^drss-/);
    });
  });
});
