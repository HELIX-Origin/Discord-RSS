import type { AppConfig } from './config.js';
import type { Database } from './db/database.js';
import type { Repository } from './db/repository.js';
import type { OAuthService } from './oauth/service.js';
import type { FeedWatcher } from './feed/watcher.js';
import type { StatusWatcher } from './status/watcher.js';
import type { RedisCoordinator } from './state/redis.js';

export interface AppDeps {
  config: AppConfig;
  db: Database;
  repo: Repository;
  oauth: OAuthService;
  feeds: FeedWatcher;
  status: StatusWatcher;
  redis: RedisCoordinator | null;
}