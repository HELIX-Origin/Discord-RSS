import { resolve } from 'node:path';

import type { LogLevel } from './util/logger.js';

export interface AppConfig {
  host: string;
  port: number;
  internalUrl: string;
  caddyEnabled: boolean;
  publicBaseUrl: string | null;
  dbPath: string;
  pollIntervalMs: number;
  requestTimeoutMs: number;
  sslKey: string | null;
  sslCert: string | null;
  botSslKey: string | null;
  botSslCert: string | null;
  logLevel: LogLevel;
  botToken: string | null;
  botPort: number;
  clientId: string | null;
  clientSecret: string | null;
  redirectUrl: string | null;
  callbackUrl: string | null;
  pingUrl: string | null;
  pingIntervalMs: number;
}

export function defaultConfig(): AppConfig {
  const rawInternal = process.env['INTERNAL_URL']?.trim();
  let envHost: string | undefined;
  let envPort: number | undefined;
  if (rawInternal) {
    const internalCandidate = rawInternal.includes('://') ? rawInternal : `http://${rawInternal}`;
    try {
      const u = new URL(internalCandidate);
      envHost = u.hostname;
      if (u.port) envPort = Number(u.port);
    } catch {
      envHost = rawInternal;
    }
  }

  const defaultHost = process.env['PORT'] ? '0.0.0.0' : '127.0.0.1';
  const host = (envHost === 'localhost' ? '0.0.0.0' : envHost) ?? process.env['HOST']?.trim() ?? defaultHost;
  const dataDir = process.env['SQLITE_DATA'] ?? resolve(process.cwd(), 'data');

  const botPort = parsePort(envPort ? String(envPort) : (process.env['DISCORD_PORT'] ?? process.env['PORT']), 3131);
  const port = parsePort(process.env['PORT'] ?? (envPort ? String(envPort) : process.env['DISCORD_PORT']), botPort);

  // Public URL: optional public URL for the service (behind reverse proxy or native SSL)
  const rawPublic =
    process.env['PUBLIC_URL']?.trim() ||
    process.env['CUSTOM_URL']?.trim() ||
    process.env['CUSTOM_DOMAIN']?.trim() ||
    null;
  let publicBaseUrl: string | null = null;
  if (rawPublic) {
    const clean = rawPublic.replace(/\/+$/, '');
    if (/^https?:\/\//i.test(clean)) {
      publicBaseUrl = clean;
    } else if (/^https?:/i.test(clean)) {
      publicBaseUrl = clean.replace(/^https?:/i, (match) => `${match.toLowerCase()}//`);
    } else {
      publicBaseUrl = `https://${clean}`;
    }
  }

  const sslKey = process.env['SITE_SSL_KEY']?.trim() || null;
  const sslCert = process.env['SITE_SSL_CERT']?.trim() || null;
  const botSslKey = process.env['DISCORD_SSL_KEY']?.trim() || sslKey;
  const botSslCert = process.env['DISCORD_SSL_CERT']?.trim() || sslCert;
  const logLevel = parseLogLevel(process.env['LOG_LEVEL']);
  const botToken = process.env['DISCORD_TOKEN']?.trim() || null;
  const clientId = process.env['DISCORD_CLIENT_ID']?.trim() || null;
  const clientSecret = process.env['DISCORD_CLIENT_SECRET']?.trim() || null;
  const callbackHost = host === '127.0.0.1' || host === '0.0.0.0' ? 'localhost' : host;
  const botProto = botSslKey && botSslCert ? 'https' : 'http';

  // Internal URL is derived from the host and the port
  const internalPingHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const internalUrl = `${botProto}://${internalPingHost}:${botPort}`;

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
      if (u.protocol === 'http:' && !u.port) {
        u.port = String(botPort);
      }
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

  const internalHealthUrl = `${internalUrl}/health`;

  const pingDisabled =
    process.env['PING_ENABLED']?.toLowerCase() === 'false' ||
    process.env['KEEP_ALIVE']?.toLowerCase() === 'false' ||
    process.env['KEEP_ALIVE_ENABLED']?.toLowerCase() === 'false';

  const rawPingUrl = process.env['PING_URL']?.trim() || process.env['KEEP_ALIVE_URL']?.trim();
  let pingUrl: string | null;
  if (pingDisabled) {
    pingUrl = null;
  } else if (rawPingUrl) {
    const trimmed = rawPingUrl.toLowerCase();
    if (trimmed === 'none' || trimmed === 'disabled' || trimmed === 'off' || trimmed === 'false') {
      pingUrl = null;
    } else if (rawPingUrl.startsWith('/')) {
      pingUrl = `${internalUrl}${rawPingUrl}`;
    } else {
      let resolved = rawPingUrl
        .replace(/\$\{?INTERNAL_URL\}?/g, internalPingHost)
        .replace(/\$\{?DISCORD_PORT\}?/g, String(botPort));
      if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
        if (resolved === internalPingHost || resolved === host) {
          resolved = `${botProto}://${internalPingHost}:${botPort}/health`;
        } else if (resolved.includes(':') || resolved.includes('/')) {
          resolved = `${botProto}://${resolved}`;
        }
      }
      pingUrl = resolved;
    }
  } else {
    pingUrl = internalHealthUrl;
  }
  const pingIntervalMs = parsePositiveInt(process.env['PING_INTERVAL_MS'], 600_000);

  const caddyEnv = process.env['CADDY_ENABLED']?.trim().toLowerCase();
  const caddyEnabled =
    caddyEnv !== undefined
      ? caddyEnv !== 'false' && caddyEnv !== 'off' && caddyEnv !== 'disabled' && caddyEnv !== '0'
      : !(sslKey && sslCert);

  return {
    host,
    port,
    internalUrl,
    caddyEnabled,
    publicBaseUrl,
    dbPath: resolve(dataDir, 'helix-rss.db'),
    pollIntervalMs: 3_600_000,
    requestTimeoutMs: parsePositiveInt(process.env['REQUEST_TIMEOUT_MS'], 15_000),
    sslKey,
    sslCert,
    botSslKey,
    botSslCert,
    logLevel,
    botToken,
    botPort,
    clientId,
    clientSecret,
    redirectUrl,
    callbackUrl,
    pingUrl,
    pingIntervalMs,
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
