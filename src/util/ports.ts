import { execSync } from 'node:child_process';
import os from 'node:os';
import type { Logger } from './logger.js';

/**
 * Checks if specific network ports are currently occupied and cleanly
 * terminates lingering processes so that the application, Discord bot,
 * and Redis server can bind without port conflicts.
 */
export function clearPorts(ports: number[], logger?: Logger): void {
  for (const port of ports) {
    if (!port || port <= 0) continue;
    try {
      if (os.platform() === 'win32') {
        const out = execSync('netstat -ano -p tcp', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const lines = out.split('\n');
        for (const line of lines) {
          if (!line.includes('LISTENING')) continue;
          const match = line.trim().match(/TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
          if (match && Number(match[1]) === port) {
            const pid = Number(match[2]);
            if (pid > 0 && pid !== process.pid) {
              logger?.warn(`Port ${port} is currently in use by process PID ${pid}. Clearing port...`);
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              logger?.info(`Terminated lingering process (PID ${pid}) on port ${port}`);
            }
          }
        }
      } else {
        execSync(`fuser -k ${port}/tcp || true`, { stdio: 'ignore' });
      }
    } catch {
      // Ignore errors clearing ports (e.g. process already exited or access denied)
    }
  }
}
