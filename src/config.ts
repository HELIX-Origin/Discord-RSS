import { resolve } from 'node:path';

import type { LogLevel } from './util/logger.js';

export interface AppConfig {
  host: string;
  port: number;
  dbPath: string;
  pollIntervalMs: number;
  requestTimeoutMs: number;
  publicBaseUrl: string | null;
  sslKey: string | null;
  sslCert: string | null;
  botSslKey: string | null;
  botSslCert: string | null;
  redisPort: number;
  redisUrl: string | null;
  logLevel: LogLevel;
  botToken: string | null;
  botPort: number;
  clientId: string | null;
  clientSecret: string | null;
  redirectUrl: string | null;
  callbackUrl: string | null;
}

export function defaultConfig(): AppConfig {
  const host = process.env['INTERNAL_URL']?.trim() ?? '127.0.0.1';
  const dataDir = process.env['SQLITE_DATA'] ?? resolve(process.cwd(), 'data');
  const publicBaseUrl = process.env['PUBLIC_URL']?.trim() || null;
  const sslKey = process.env['SITE_SSL_KEY']?.trim() || null;
  const sslCert = process.env['SITE_SSL_CERT']?.trim() || null;
  const botSslKey = process.env['DISCORD_SSL_KEY']?.trim() || sslKey;
  const botSslCert = process.env['DISCORD_SSL_CERT']?.trim() || sslCert;
  const logLevel = parseLogLevel(process.env['LOG_LEVEL']);
  const botToken = process.env['DISCORD_TOKEN']?.trim() || null;
  const botPort = parsePort(process.env['DISCORD_PORT'], 3131);
  const port = parsePort(process.env['PORT'] ?? process.env['DISCORD_PORT'], botPort);
  const redisPort = parsePort(process.env['REDIS_PORT'], 3535);
  const redisUrl = `redis://${host}:${redisPort}`;
  const clientId = process.env['DISCORD_CLIENT_ID']?.trim() || null;
  const clientSecret = process.env['DISCORD_CLIENT_SECRET']?.trim() || null;
  const callbackHost = host === '127.0.0.1' || host === '0.0.0.0' ? 'localhost' : host;
  const botProto = botSslKey && botSslCert ? 'https' : 'http';

  // DISCORD_REDIRECT_URL is the Bot Invite / Authorization URL
  const redirectUrl =
    process.env['DISCORD_REDIRECT_URL']?.trim() ||
    (clientId
      ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=8&integration_type=0&scope=bot+applications.commands`
      : null);

  // DISCORD_CALLBACK_URL is the OAuth Callback URL auto-derived from host/port or publicBaseUrl, always using botPort
  let callbackUrl: string;
  if (process.env['DISCORD_CALLBACK_URL']?.trim()) {
    callbackUrl = process.env['DISCORD_CALLBACK_URL']!.trim();
  } else if (publicBaseUrl) {
    try {
      const u = new URL(publicBaseUrl);
      u.port = String(botPort);
      u.pathname = '/api/auth/callback/discord';
      u.search = '';
      u.hash = '';
      callbackUrl = u.toString();
    } catch {
      callbackUrl = `${botProto}://${callbackHost}:${botPort}/api/auth/callback/discord`;
    }
  } else {
    callbackUrl = `${botProto}://${callbackHost}:${botPort}/api/auth/callback/discord`;
  }

  return {
    host,
    port,
    dbPath: resolve(dataDir, 'helix-rss.db'),
    pollIntervalMs: 3_600_000,
    requestTimeoutMs: parsePositiveInt(process.env['REQUEST_TIMEOUT_MS'], 15_000),
    publicBaseUrl,
    sslKey,
    sslCert,
    botSslKey,
    botSslCert,
    redisPort,
    redisUrl,
    logLevel,
    botToken,
    botPort,
    clientId,
    clientSecret,
    redirectUrl,
    callbackUrl,
  };
}

function parseLogLevel(raw: string | undefined): LogLevel {
  const value = raw?.toLowerCase();
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') return value;
  return 'info';
}

function parsePort(raw: string | undefined, fallback = 3131): number {
  if (raw === undefined) return fallback;
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
