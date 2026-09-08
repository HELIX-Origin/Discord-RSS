import { defaultConfig, type AppConfig } from '../../src/config.js';
import { Database } from '../../src/db/database.js';
import { Repository } from '../../src/db/repository.js';
import { FeedWatcher } from '../../src/feed/watcher.js';
import { OAuthService } from '../../src/oauth/service.js';
import { StatusWatcher } from '../../src/status/watcher.js';
import { createRedisCoordinator, type RedisCoordinator } from '../../src/state/redis.js';
import type { AppDeps } from '../../src/app.js';
import { openTestDb, closeTestDb } from './db.js';

export interface BuiltAppDeps {
  deps: AppDeps;
  cleanup: () => Promise<void>;
}

export async function buildAppDeps(options?: {
  db?: Database;
  config?: Partial<AppConfig>;
  redisUrl?: string | null;
}): Promise<BuiltAppDeps> {
  const db = options?.db ?? openTestDb('appdeps', 'error');
  const repo = new Repository(db);
  const oauth = new OAuthService(repo);

  const config: AppConfig = {
    ...defaultConfig(),
    port: 0,
    host: '127.0.0.1',
    pollIntervalMs: 3_600_000,
    statusIntervalMs: 3_600_000,
    ...(options?.config ?? {}),
  };

  let redis: RedisCoordinator | null = null;
  if (options?.redisUrl !== undefined) {
    redis = options.redisUrl === null ? null : await createRedisCoordinator(options.redisUrl);
  }

  const feeds = new FeedWatcher(repo, redis, config.logLevel);
  const status = new StatusWatcher(repo, redis, config.logLevel);

  const cleanup = async () => {
    await redis?.close();
    await closeTestDb(db);
  };

  return {
    deps: { config, db, repo, oauth, feeds, status, redis },
    cleanup,
  };
}
