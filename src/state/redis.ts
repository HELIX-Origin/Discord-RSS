/**
 * Optional cross-instance coordination layer.
 *
 * Enabled only when DISCORD_RSS_REDIS_URL is set. Used for distributed poll
 * locks and shared sent-entry dedupe so multiple app instances never deliver
 * the same feed entry twice. Every call degrades gracefully: if Redis is
 * unreachable, locks are treated as acquirable (single-instance fallback),
 * sent-checks report false, and mark/send operations no-op.
 */
import { createClient, type RedisClientType } from 'redis';

export interface RedisCoordinator {
  readonly enabled: boolean;
  readonly instanceId: string;
  isEntrySent(feedId: number, entryId: string): Promise<boolean>;
  markEntrySent(feedId: number, entryId: string): Promise<void>;
  acquireLock(key: string, ttlMs: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
  close(): Promise<void>;
}

class RedisCoordinatorImpl implements RedisCoordinator {
  readonly enabled = true;
  readonly instanceId: string;
  private degradedLogged = false;

  private constructor(
    private readonly client: RedisClientType,
    instanceId: string,
  ) {
    this.instanceId = instanceId;
  }

  static async connect(url: string): Promise<RedisCoordinatorImpl | null> {
    const client = createClient({ url });
    client.on('error', () => {
      /* handled inline per operation */
    });
    try {
      await client.connect();
      await client.ping();
    } catch {
      try {
        await client.quit();
      } catch {
        /* ignore */
      }
      return null;
    }
    return new RedisCoordinatorImpl(client as RedisClientType, `drss-${randomId()}`);
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
        console.warn('[redis] coordinator degraded; falling back to single-instance behavior');
      }
      return fallback;
    }
  }

  async isEntrySent(feedId: number, entryId: string): Promise<boolean> {
    return this.safe(false, async () => (await this.client.sIsMember(this.entryKey(feedId), entryId)) === 1);
  }

  async markEntrySent(feedId: number, entryId: string): Promise<void> {
    await this.safe(undefined, () => this.client.sAdd(this.entryKey(feedId), entryId));
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    return this.safe(true, async () => {
      const ok = await this.client.set(`drss:lock:${key}`, this.instanceId, { NX: true, EX: Math.max(1, Math.floor(ttlMs / 1000)) });
      return ok === 'OK';
    });
  }

  async releaseLock(key: string): Promise<void> {
    await this.safe(undefined, () => this.client.del(`drss:lock:${key}`));
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
  }
}

export async function createRedisCoordinator(url: string | null | undefined): Promise<RedisCoordinator | null> {
  if (!url) return null;
  try {
    const impl = await RedisCoordinatorImpl.connect(url);
    if (!impl) {
      console.warn('[redis] connection failed; continuing without cross-instance coordination');
      return null;
    }
    console.log(`[redis] coordinator connected (${impl.instanceId})`);
    return impl;
  } catch {
    console.warn('[redis] coordinator init failed; continuing without cross-instance coordination');
    return null;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}