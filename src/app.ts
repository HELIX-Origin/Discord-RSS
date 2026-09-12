import type { AppConfig } from './config.js';
import type { Database } from './db/database.js';
import type { Repository } from './db/repository.js';
import type { OAuthService } from './oauth/service.js';
import type { FeedWatcher } from './feed/watcher.js';
import type { RedisCoordinator } from './state/redis.js';
import type { WebhookRouter } from './webhook/router.js';

import type { DiscordBot } from './bot/bot.js';
import type { Scheduler } from './scheduler/scheduler.js';

export interface AppDeps {
  config: AppConfig;
  db: Database;
  repo: Repository;
  oauth: OAuthService;
  feeds: FeedWatcher;
  redis: RedisCoordinator | null;
  bot?: DiscordBot | null;
  scheduler?: Scheduler | null;
  webhookRouter?: WebhookRouter;
}

/**
 * Resolve the application display name from the configured Discord bot application.
 * Falls back to the service's default name only when no bot context is available.
 */
export function appDisplayName(deps: AppDeps): string {
  return deps.bot?.getAppName() ?? 'HELIX RSS';
}
