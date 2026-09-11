import type { AppDeps } from './app.js';
import { defaultConfig } from './config.js';
import { Database } from './db/database.js';
import { Repository } from './db/repository.js';
import { FeedWatcher } from './feed/watcher.js';
import { OAuthService } from './oauth/service.js';
import { Scheduler } from './scheduler/scheduler.js';
import { createDiscordRssServer } from './server.js';
import { launchRedisServer } from './state/redis-process.js';
import { createRedisCoordinator } from './state/redis.js';
import { StatusWatcher } from './status/watcher.js';
import { createLogger } from './util/logger.js';
import { clearPorts } from './util/ports.js';

import { DiscordBot } from './bot/bot.js';

export async function main(): Promise<void> {
  const config = defaultConfig();
  const logger = createLogger('app', config.logLevel);

  // 1. Clear ports if currently occupied by lingering processes
  clearPorts([config.port, config.botPort, config.redisPort], logger);

  // 2. Launch Redis server alongside the service (if not already running)
  const redisProcess = await launchRedisServer(config.redisPort, config.host, logger);

  const db = Database.open(config.dbPath);
  const repo = new Repository(db);
  const oauth = new OAuthService(repo, config);
  const redis = await createRedisCoordinator(config.redisUrl);
  const feeds = new FeedWatcher(repo, redis, config.logLevel);
  const status = new StatusWatcher(repo, redis, config.logLevel);

  let bot: DiscordBot | null = null;
  if (config.botToken) {
    bot = new DiscordBot(
      { config, db, repo, oauth, feeds, status, redis },
      {
        token: config.botToken,
        clientId: config.clientId,
        redirectUrl: config.redirectUrl,
        callbackUrl: config.callbackUrl,
        port: config.botPort,
        host: config.host,
        sslKey: config.botSslKey,
        sslCert: config.botSslCert,
      },
    );
    feeds.setBot(bot);
    status.setBot(bot);
  }

  const deps: AppDeps = { config, db, repo, oauth, feeds, status, redis, bot };

  const scheduler = new Scheduler(config.logLevel);
  scheduler.schedule('feed-poll', config.pollIntervalMs, () => feeds.pollAllFeeds());
  scheduler.schedule('status-check', config.statusIntervalMs, () => status.checkAllMonitors());
  scheduler.start();

  if (bot) {
    await bot.start();
  }

  const server = createDiscordRssServer(deps);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(
        `Port ${config.port} on ${config.host} is already in use. Another instance of HELIX RSS may already be running.`,
      );
    } else {
      logger.error('HTTP server error', { err: err.message });
    }
    scheduler.stop();
    bot?.stop();
    void redis?.close();
    redisProcess?.stop();
    db.close();
    process.exit(1);
  });

  server.listen(config.port, config.host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : config.port;
    logger.info('HELIX RSS started', {
      host: config.host,
      port,
      dbPath: config.dbPath,
      botEnabled: Boolean(bot),
    });
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}; shutting down`);
    scheduler.stop();
    bot?.stop();
    server.close(async () => {
      await redis?.close();
      redisProcess?.stop();
      db.close();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      redisProcess?.stop();
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  main().catch((err) => {
    console.error('Failed to start HELIX RSS:', err);
    process.exit(1);
  });
}
