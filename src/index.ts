import { defaultConfig } from './config.js';
import { Database } from './db/database.js';
import { Repository } from './db/repository.js';
import { FeedWatcher } from './feed/watcher.js';
import { OAuthService } from './oauth/service.js';
import { Scheduler } from './scheduler/scheduler.js';
import { createRedisCoordinator } from './state/redis.js';
import { createLogger } from './util/logger.js';
import { clearPorts } from './util/ports.js';
import { KeepAlivePing } from './util/keep-alive.js';
import { existsSync } from 'node:fs';
import { ensureCaddyBinary, CaddySupervisor } from './proxy/caddy.js';

import { DiscordBot } from './bot/bot.js';

export async function main(): Promise<void> {
  const config = defaultConfig();
  const logger = createLogger('app', config.logLevel);

  // 1. Clear ports if currently occupied by lingering processes
  clearPorts([config.botPort, config.port], logger);

  const db = Database.open(config.dbPath);
  const repo = new Repository(db);
  const oauth = new OAuthService(repo, config);
  const redis = await createRedisCoordinator(undefined, config.logLevel);
  const feeds = new FeedWatcher(repo, redis, config.logLevel);

  // 3. Start background polling scheduler
  const scheduler = new Scheduler(config.logLevel);
  const savedInterval = repo.getSetting('poll_interval_ms');
  const initialInterval = savedInterval ? Number(savedInterval) : config.pollIntervalMs;
  scheduler.schedule('feed-poll', initialInterval, () => feeds.pollAllFeeds());
  scheduler.start();

  // 4. Create Discord Bot as primary application process
  const bot = new DiscordBot(
    { config, db, repo, oauth, feeds, redis, scheduler },
    {
      token: config.botToken || '',
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

  // 5. Start primary bot process (which starts Gateway, bot HTTP server, and site sub-process)
  await bot.start();

  // 6. Start Caddy reverse proxy if enabled
  let caddySupervisor: CaddySupervisor | null = null;
  if (config.caddyEnabled) {
    const dataDir = resolve(config.dbPath, '..');
    const caddyPath = await ensureCaddyBinary(dataDir, logger);
    if (caddyPath) {
      const caddyfileCustom = resolve(process.cwd(), 'Caddyfile');
      const caddyfileExample = resolve(process.cwd(), 'Caddyfile.example');
      const caddyfilePath = existsSync(caddyfileCustom) ? caddyfileCustom : caddyfileExample;
      const targetHost = config.host === '0.0.0.0' ? '127.0.0.1' : config.host;
      caddySupervisor = new CaddySupervisor({
        caddyPath,
        caddyfilePath,
        publicUrl: config.publicBaseUrl,
        internalTarget: `${targetHost}:${config.botPort}`,
        logger,
      });
      caddySupervisor.start();
    }
  }

  // 7. Start network keep-alive ping if configured
  let keepAlive: KeepAlivePing | null = null;
  if (config.pingUrl) {
    keepAlive = new KeepAlivePing({
      targetUrl: config.pingUrl,
      intervalMs: config.pingIntervalMs,
      logger,
    });
    keepAlive.start();
  }

  logger.info('HELIX RSS started with unified server', {
    host: config.host,
    port: config.botPort,
    caddyRunning: caddySupervisor?.isRunning() ?? false,
    pingUrl: config.pingUrl,
    dbPath: config.dbPath,
    botTokenConfigured: Boolean(config.botToken),
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}; shutting down`);
    scheduler.stop();
    keepAlive?.stop();
    caddySupervisor?.stop();
    bot.stop();
    void (async () => {
      await redis?.close();
      db.close();
      logger.info('Shutdown complete');
      process.exit(0);
    })();
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
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
