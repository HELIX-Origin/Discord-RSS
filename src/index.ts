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

export async function main(): Promise<void> {
  const config = defaultConfig();

  const db = Database.open(config.dbPath);
  const repo = new Repository(db);
  const oauth = new OAuthService(repo);
  const redis = await createRedisCoordinator(config.redisUrl);
  const feeds = new FeedWatcher(repo, redis);
  const status = new StatusWatcher(repo, redis);

  const deps: AppDeps = { config, db, repo, oauth, feeds, status, redis };

  const scheduler = new Scheduler();
  scheduler.schedule('feed-poll', config.pollIntervalMs, () => feeds.pollAllFeeds());
  scheduler.schedule('status-check', config.statusIntervalMs, () => status.checkAllMonitors());
  scheduler.start();

  const server = createDiscordRssServer(deps);
  server.listen(config.port, config.host, () => {
    console.log(`Discord RSS running at http://${config.host}:${config.port}`);
    console.log(`Database: ${config.dbPath}`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n[discord-rss] received ${signal}; shutting down`);
    scheduler.stop();
    server.close(async () => {
      await redis?.close();
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
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