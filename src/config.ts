import { resolve } from 'node:path';

import type { LogLevel } from './util/logger.js';

export interface AppConfig {
  host: string;
  port: number;
  internalUrl: string;
  cloudHostUrl: string | null;
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
  httpsProxyPort: number | null;
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

  const host = envHost ?? process.env['HOST']?.trim() ?? '127.0.0.1';
  const dataDir = process.env['SQLITE_DATA'] ?? resolve(process.cwd(), 'data');

  // Cloud host-provided dynamic URLs
  const cloudHostUrl =
    process.env['RENDER_EXTERNAL_URL']?.trim() ||
    (process.env['RAILWAY_STATIC_URL']
      ? `https://${process.env['RAILWAY_STATIC_URL'].trim().replace(/^https?:\/\//, '')}`
      : null) ||
    (process.env['RAILWAY_PUBLIC_DOMAIN']
      ? `https://${process.env['RAILWAY_PUBLIC_DOMAIN'].trim().replace(/^https?:\/\//, '')}`
      : null) ||
    (process.env['FLY_APP_NAME'] ? `https://${process.env['FLY_APP_NAME'].trim()}.fly.dev` : null) ||
    null;

  const botPort = parsePort(envPort ? String(envPort) : (process.env['DISCORD_PORT'] ?? process.env['PORT']), 3131);
  const port = parsePort(process.env['PORT'] ?? (envPort ? String(envPort) : process.env['DISCORD_PORT']), botPort);

  // Public URL: handles public URLs, custom hostnames/domains, and proxy port.
  // Supports formats like https:your-domain.com, https://your-domain.com, helix.local, etc.
  // If no port is specified, it auto-increments its port from the INTERNAL_URL port (botPort + 1).
  const rawPublic =
    process.env['PUBLIC_URL']?.trim() ||
    process.env['CUSTOM_URL']?.trim() ||
    process.env['CUSTOM_DOMAIN']?.trim() ||
    null;
  let publicBaseUrl: string | null = null;
  let publicPort: number | null = null;

  if (rawPublic) {
    let normalized = rawPublic.trim();
    if (/^https?:/i.test(normalized)) {
      normalized = normalized.replace(/^https?:?\/*/i, (match) => {
        return match.toLowerCase().startsWith('http:') ? 'http://' : 'https://';
      });
    } else {
      normalized = `https://${normalized}`;
    }

    let hostPart: string;
    let scheme: string;
    let explicitPort: number | null = null;

    try {
      const u = new URL(normalized);
      scheme = u.protocol.replace(':', '');
      hostPart = u.hostname;
      if (u.port) {
        explicitPort = Number(u.port);
      }
    } catch {
      const parts = normalized.split('://');
      scheme = parts[0]!;
      const afterScheme = parts[1]!.replace(/\/+$/, '');
      const portMatch = afterScheme.match(/:(\d+)$/);
      if (portMatch?.[1]) {
        explicitPort = Number(portMatch[1]);
        hostPart = afterScheme.slice(0, -portMatch[0].length);
      } else {
        hostPart = afterScheme;
      }
    }

    hostPart = hostPart.replace(/\/+$/, '');
    publicPort = explicitPort ?? botPort + 1;
    // If no explicit port is specified in the URL, auto-increment the internal proxy port without exposing it in the raw URL
    publicBaseUrl = explicitPort ? `${scheme}://${hostPart}:${explicitPort}` : `${scheme}://${hostPart}`;
  } else if (cloudHostUrl) {
    publicBaseUrl = cloudHostUrl.replace(/\/+$/, '');
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

  const rawPingUrl = process.env['PING_URL']?.trim() || process.env['KEEP_ALIVE_URL']?.trim();
  let pingUrl: string | null;
  if (rawPingUrl) {
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
    const renderExternal = process.env['RENDER_EXTERNAL_URL']?.trim();
    pingUrl = renderExternal ? `${renderExternal.replace(/\/+$/, '')}/health` : internalHealthUrl;
  }
  const pingIntervalMs = parsePositiveInt(process.env['PING_INTERVAL_MS'], 600_000);

  const rawHttpsPort = process.env['HTTPS_PORT'] ?? process.env['HTTPS_PROXY_PORT'];
  let httpsProxyPort: number | null = null;
  if (rawHttpsPort !== undefined && rawHttpsPort.trim() !== '') {
    const trimmed = rawHttpsPort.trim().toLowerCase();
    if (trimmed === 'none' || trimmed === 'disabled' || trimmed === 'off' || trimmed === 'false' || trimmed === '0') {
      httpsProxyPort = null;
    } else {
      httpsProxyPort = parsePort(rawHttpsPort.trim(), 3443);
    }
  } else if (publicPort !== null) {
    if (publicPort === botPort) {
      httpsProxyPort = null;
    } else {
      httpsProxyPort = publicPort;
    }
  }

  return {
    host,
    port,
    internalUrl,
    cloudHostUrl,
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
    httpsProxyPort,
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
