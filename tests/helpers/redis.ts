import { createRedisCoordinator, type RedisCoordinator } from '../../src/state/redis.js';
import { startMockRedisServer, type MockRedisServer } from '../mocks/redis-server.js';

export interface RedisTestContext {
  server: MockRedisServer;
  coordinator: RedisCoordinator;
  url: string;
}

export async function withMockRedis<T>(fn: (url: string) => Promise<T>): Promise<T> {
  const server = await startMockRedisServer();
  try {
    return await fn(server.url);
  } finally {
    await server.close();
  }
}

export async function withRedisCoordinator<T>(fn: (ctx: RedisTestContext) => Promise<T>): Promise<T> {
  const server = await startMockRedisServer();
  try {
    const coordinator = await createRedisCoordinator(server.url);
    if (!coordinator) throw new Error('Failed to create Redis coordinator');
    try {
      return await fn({ server, coordinator, url: server.url });
    } finally {
      await coordinator.close();
    }
  } finally {
    await server.close();
  }
}
