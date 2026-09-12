import { resolve } from 'node:path';

import type { LogLevel } from './util/logger.js';

export interface AppConfig {
  host: string;
  port: number;
  internalUrl: string;
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
  discordApiBaseUrl: string;
  repoUrl: string;
  userAgent: string;
  defaultTheme: string;
  dashboardColorScheme: string;
  landingPageEnabled: boolean;
  forumChannelIds: string[];
  threadKeepaliveEnabled: boolean;
  threadKeepaliveIntervalMs: number;
  threadKeepaliveGraceMs: number;
  threadMaxMessages: number;
  youtubeApiKey: string | null;
  twitchClientId: string | null;
  twitchClientSecret: string | null;
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

  const defaultHost = '127.0.0.1';
  const host = (envHost === 'localhost' ? '0.0.0.0' : envHost) ?? process.env['HOST']?.trim() ?? defaultHost;
  const dataDir = process.env['SQLITE_DATA'] ?? resolve(process.cwd(), 'data');

  const botPort = parsePort(envPort ? String(envPort) : process.env['DISCORD_PORT'], 3131);
  const port = parsePort(envPort ? String(envPort) : process.env['DISCORD_PORT'], botPort);

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

  const repoUrl =
    process.env['REPO_URL']?.trim() ||
    process.env['GITHUB_REPO']?.trim() ||
    process.env['REPOSITORY_URL']?.trim() ||
    process.env['PROJECT_URL']?.trim() ||
    '';

  const userAgent =
    process.env['USER_AGENT']?.trim() ||
    process.env['DISCORD_USER_AGENT']?.trim() ||
    (repoUrl ? `DiscordBot (${repoUrl}, 0.1.0)` : 'DiscordBot (0.1.0)');

  const rawTheme =
    process.env['DASHBOARD_THEME']?.trim().toLowerCase() ||
    process.env['DEFAULT_THEME']?.trim().toLowerCase() ||
    process.env['THEME']?.trim().toLowerCase() ||
    'dark';
  const defaultTheme = rawTheme === 'glass' ? 'glassmorphism' : rawTheme;

  const landingPageEnabled =
    process.env['LANDING_PAGE_ENABLED']?.trim().toLowerCase() !== 'false' &&
    process.env['ENABLE_LANDING_PAGE']?.trim().toLowerCase() !== 'false';

  const dashboardColorScheme =
    process.env['DASHBOARD_COLOR_SCHEME']?.trim().toLowerCase() ||
    process.env['COLOR_SCHEME']?.trim().toLowerCase() ||
    process.env['ACCENT_COLOR']?.trim().toLowerCase() ||
    'default';

  const forumChannelIds = parseCsvIds(process.env['FORUM_CHANNEL_IDS'] || process.env['THREAD_FORUM_CHANNEL_IDS']);

  const threadKeepaliveEnabled =
    process.env['THREAD_KEEPALIVE_ENABLED']?.toLowerCase() !== 'false' &&
    process.env['KEEP_THREADS_OPEN']?.toLowerCase() !== 'false';

  const youtubeApiKey = process.env['YOUTUBE_API_KEY']?.trim() || null;
  const twitchClientId = process.env['TWITCH_CLIENT_ID']?.trim() || null;
  const twitchClientSecret = process.env['TWITCH_CLIENT_SECRET']?.trim() || null;

  return {
    host,
    port,
    internalUrl,
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
    discordApiBaseUrl: process.env['DISCORD_API_BASE_URL']?.trim() || 'https://discord.com/api/v10',
    repoUrl,
    userAgent,
    defaultTheme,
    dashboardColorScheme,
    landingPageEnabled,
    forumChannelIds,
    threadKeepaliveEnabled,
    threadKeepaliveIntervalMs: parsePositiveInt(process.env['THREAD_KEEPALIVE_INTERVAL_MS'], 6 * 3600 * 1000),
    threadKeepaliveGraceMs: parsePositiveInt(process.env['THREAD_KEEPALIVE_GRACE_MS'], 24 * 3600 * 1000),
    threadMaxMessages: parsePositiveInt(process.env['THREAD_MAX_MESSAGES'], 100),
    youtubeApiKey,
    twitchClientId,
    twitchClientSecret,
  };
}

function parseCsvIds(raw: string | undefined): string[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d{10,25}$/.test(part));
  return Array.from(new Set(ids));
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
