/**
 * In-memory coordination layer powered by ioredis-mock.
 *
 * Removes the requirement for an external redis-server binary, allowing
 * instant boot on any hosting platform or local development with standard
 * npm install and npm start.
 */
import RedisMock from 'ioredis-mock';
import { createLogger } from '../util/logger.js';

export interface RedisCoordinator {
  readonly enabled: boolean;
  readonly instanceId: string;
  isEntrySent(feedId: number, entryId: string): Promise<boolean>;
  markEntrySent(feedId: number, entryId: string): Promise<void>;
  acquireLock(key: string, ttlMs: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
  close(): Promise<void>;
}

export class RedisCoordinatorImpl implements RedisCoordinator {
  readonly enabled = true;
  readonly instanceId: string;
  private degradedLogged = false;
  private readonly logger = createLogger('redis');

  constructor(
    private readonly client: InstanceType<typeof RedisMock>,
    instanceId?: string,
  ) {
    this.instanceId = instanceId ?? `drss-${randomId()}`;
  }

  static create(client?: InstanceType<typeof RedisMock>): RedisCoordinatorImpl {
    const mock = client ?? new RedisMock();
    return new RedisCoordinatorImpl(mock);
  }

  private entryKey(feedId: number): string {
    return `drss:sent:${feedId}`;
  }

  private async safe<T>(fallback: T, op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch {
      if (!this.degradedLogged) {
        this.degradedLogged = true;
        this.logger.warn('Redis coordinator degraded; falling back to single-instance behavior');
      }
      return fallback;
    }
  }

  async isEntrySent(feedId: number, entryId: string): Promise<boolean> {
    return this.safe(false, async () => (await this.client.sismember(this.entryKey(feedId), entryId)) === 1);
  }

  async markEntrySent(feedId: number, entryId: string): Promise<void> {
    await this.safe(undefined, async () => {
      await this.client.sadd(this.entryKey(feedId), entryId);
    });
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    return this.safe(true, async () => {
      const ttlSec = Math.max(1, Math.floor(ttlMs / 1000));
      const ok = await this.client.set(`drss:lock:${key}`, this.instanceId, 'EX', ttlSec, 'NX');
      return ok === 'OK';
    });
  }

  async releaseLock(key: string): Promise<void> {
    await this.safe(undefined, async () => {
      await this.client.del(`drss:lock:${key}`);
    });
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
  }
}

export async function createRedisCoordinator(
  _url?: string | null,
  logLevel?: import('../util/logger.js').LogLevel,
): Promise<RedisCoordinator | null> {
  const logger = createLogger('redis', logLevel);
  try {
    const coordinator = RedisCoordinatorImpl.create();
    logger.info('In-memory Redis coordinator initialized with ioredis-mock', {
      instanceId: coordinator.instanceId,
    });
    return coordinator;
  } catch {
    logger.warn('Failed to initialize ioredis-mock coordinator; continuing in standalone mode');
    return null;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
