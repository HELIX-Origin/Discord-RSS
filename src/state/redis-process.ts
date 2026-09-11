import { spawn, type ChildProcess } from 'node:child_process';
import { createClient } from 'redis';
import type { Logger } from '../util/logger.js';

export interface RunningRedisProcess {
  process: ChildProcess;
  stop: () => void;
}

/**
 * Ensures Redis is running and reachable on the given port.
 * If Redis is not already responding on that port, attempts to spawn `redis-server --port <port>`.
 * Returns a handle to stop the process on shutdown, or null if Redis was already active or unavailable.
 */
export async function launchRedisServer(
  port: number,
  host = '127.0.0.1',
  logger?: Logger,
): Promise<RunningRedisProcess | null> {
  const probeHost = host === '0.0.0.0' ? '127.0.0.1' : host;

  // 1. Check if Redis is already running and reachable
  try {
    const probe = createClient({
      url: `redis://${probeHost}:${port}`,
      socket: { reconnectStrategy: false, connectTimeout: 300 },
    });
    probe.on('error', () => {});
    await probe.connect();
    await probe.ping();
    await probe.quit();
    logger?.info(`Redis is already active and responding on port ${port}`);
    return null;
  } catch {
    // Redis is not responding; spawn it
  }

  try {
    logger?.info(`Launching redis-server on port ${port}...`);
    const child = spawn('redis-server', ['--port', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    child.on('error', (err) => {
      logger?.warn(`Could not launch redis-server automatically (${err.message}). Proceeding in standalone mode.`);
    });

    // Wait up to 2.5 seconds for Redis to start accepting connections
    let ready = false;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const client = createClient({
          url: `redis://${probeHost}:${port}`,
          socket: { reconnectStrategy: false, connectTimeout: 300 },
        });
        client.on('error', () => {});
        await client.connect();
        await client.ping();
        await client.quit();
        ready = true;
        break;
      } catch {
        // Probe again
      }
    }

    if (ready) {
      logger?.info(`redis-server is ready and accepting connections on port ${port}`);
    } else {
      logger?.warn(`redis-server spawned on port ${port} but did not respond to probe in time.`);
    }

    return {
      process: child,
      stop: () => {
        try {
          child.kill('SIGTERM');
        } catch {
          // ignore error on kill
        }
      },
    };
  } catch (err) {
    logger?.warn(`Failed to launch redis-server: ${(err as Error).message}`);
    return null;
  }
}
