import { createRedisCoordinator, type RedisCoordinator } from '../../src/state/redis.js';
import { startMockRedisServer, type MockRedisServer } from '../mocks/redis-server.js';

export interface RedisTestContext {
  server: MockRedisServer;
  coordinator: RedisCoordinator;
  url: string;
}

export async function withMockRedis<T>(fn: (url: string) => Promise<T>): Promise<T> {
  const url = 'redis://127.0.0.1:6379';
  return await fn(url);
}

export async function withRedisCoordinator<T>(fn: (ctx: RedisTestContext) => Promise<T>): Promise<T> {
  const coordinator = await createRedisCoordinator('redis://127.0.0.1:6379');
  if (!coordinator) throw new Error('Failed to create Redis coordinator');
  const server = await startMockRedisServer();
  try {
    return await fn({ server, coordinator, url: server.url });
  } finally {
    await coordinator.close();
    await server.close();
  }
}
