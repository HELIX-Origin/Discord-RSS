import type { AppDeps } from './app.js';
import { defaultConfig } from './config.js';
import { Database } from './db/database.js';
import { Repository } from './db/repository.js';
import { FeedWatcher } from './feed/watcher.js';
import { OAuthService } from './oauth/service.js';
import { Scheduler } from './scheduler/scheduler.js';
import { createDiscordRssServer } from './server.js';
import { createRedisCoordinator } from './state/redis.js';
import { StatusWatcher } from './status/watcher.js';
import { createLogger } from './util/logger.js';

export async function main(): Promise<void> {
  const config = defaultConfig();
  const logger = createLogger('app', config.logLevel);

  const db = Database.open(config.dbPath);
  const repo = new Repository(db);
  const oauth = new OAuthService(repo);
  const redis = await createRedisCoordinator(config.redisUrl);
  const feeds = new FeedWatcher(repo, redis, config.logLevel);
  const status = new StatusWatcher(repo, redis, config.logLevel);

  const deps: AppDeps = { config, db, repo, oauth, feeds, status, redis };

  const scheduler = new Scheduler(config.logLevel);
  scheduler.schedule('feed-poll', config.pollIntervalMs, () => feeds.pollAllFeeds());
  scheduler.schedule('status-check', config.statusIntervalMs, () => status.checkAllMonitors());
  scheduler.start();

  const server = createDiscordRssServer(deps);
  server.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    logger.info('Discord RSS started', { host: config.host, port, dbPath: config.dbPath });
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}; shutting down`);
    scheduler.stop();
    server.close(async () => {
      await redis?.close();
      db.close();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((err) => {
    console.error('Failed to start Discord RSS:', err);
    process.exit(1);
  });
}