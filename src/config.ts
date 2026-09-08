import { resolve } from 'node:path';

import type { LogLevel } from './util/logger.js';

export interface AppConfig {
  host: string;
  port: number;
  dbPath: string;
  pollIntervalMs: number;
  statusIntervalMs: number;
  requestTimeoutMs: number;
  publicBaseUrl: string | null;
  redisUrl: string | null;
  logLevel: LogLevel;
}

export function defaultConfig(): AppConfig {
  const port = parsePort(process.env['DISCORD_RSS_PORT']);
  const host = process.env['DISCORD_RSS_HOST'] ?? '127.0.0.1';
  const dataDir = process.env['DISCORD_RSS_DATA'] ?? resolve(process.cwd(), 'data');
  const publicBaseUrl = process.env['DISCORD_RSS_PUBLIC_BASE_URL']?.trim() || null;
  const logLevel = parseLogLevel(process.env['DISCORD_RSS_LOG_LEVEL']);

  return {
    host,
    port,
    dbPath: resolve(dataDir, 'discord-rss.db'),
    pollIntervalMs: parsePositiveInt(process.env['DISCORD_RSS_POLL_INTERVAL_MS'], 60_000),
    statusIntervalMs: parsePositiveInt(process.env['DISCORD_RSS_STATUS_INTERVAL_MS'], 30_000),
    requestTimeoutMs: parsePositiveInt(process.env['DISCORD_RSS_REQUEST_TIMEOUT_MS'], 15_000),
    publicBaseUrl,
    redisUrl: process.env['DISCORD_RSS_REDIS_URL']?.trim() || null,
    logLevel,
  };
}

function parseLogLevel(raw: string | undefined): LogLevel {
  const value = raw?.toLowerCase();
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') return value;
  return 'info';
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return 3434;
  const value = Number(raw);
  // Port 0 is allowed so smoke tests can bind to an ephemeral port.
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error(`Invalid port: ${raw}`);
  }
  return value;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid integer value: ${raw}`);
  }
  return value;
}