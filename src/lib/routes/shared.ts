import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppDeps } from '../../app.js';
import { COOKIE_NAME, getRequestBaseUrl, parseCookies, sendError } from '../../http/helpers.js';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3600;

export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isLocalhostRequest(req: IncomingMessage): boolean {
  const ip = req.socket?.remoteAddress;
  if (!ip) return false;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.');
}

export function getSessionToken(req: IncomingMessage): string {
  return parseCookies(req)[COOKIE_NAME] ?? '';
}

export async function authedUserId(req: IncomingMessage, deps: AppDeps): Promise<number | null> {
  const token = getSessionToken(req);
  if (token) {
    const user = deps.repo.getUserBySessionToken(token);
    if (user) return user.id;
  }
  return null;
}

export function isOwnerUser(userId: number | null, deps?: AppDeps): boolean {
  if (userId === null) return false;
  if (deps) {
    const user = deps.repo.getUserById(userId);
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (deps.bot) {
      const conns = deps.oauth.connectionsFor(userId);
      const discordConn = conns.find((c) => c.provider === 'discord');
      if (discordConn && deps.bot.isOwnerDiscordId(discordConn.providerAccountId)) {
        return true;
      }
    }
  }
  return false;
}

export const isHostUser = isOwnerUser;

export function isAdminOrOwner(userId: number | null, deps: AppDeps): boolean {
  if (userId === null) return false;
  const user = deps.repo.getUserById(userId);
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (deps.bot) {
    const conns = deps.oauth.connectionsFor(userId);
    const discordConn = conns.find((c) => c.provider === 'discord');
    if (discordConn && deps.bot.isOwnerOrAdminDiscordId(discordConn.providerAccountId)) {
      return true;
    }
  }
  return false;
}

export async function requireUser(req: IncomingMessage, res: ServerResponse, deps: AppDeps): Promise<number | null> {
  const userId = await authedUserId(req, deps);
  if (userId === null) sendError(res, 401, 'Authentication required');
  return userId;
}

export async function requireAdminOrOwner(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
): Promise<number | null> {
  const userId = await authedUserId(req, deps);
  if (userId === null) {
    sendError(res, 401, 'Authentication required');
    return null;
  }
  if (!isAdminOrOwner(userId, deps)) {
    sendError(res, 403, 'Forbidden: Administrator or Owner access required');
    return null;
  }
  return userId;
}

export async function requireOwner(req: IncomingMessage, res: ServerResponse, deps: AppDeps): Promise<number | null> {
  const userId = await authedUserId(req, deps);
  if (userId === null) {
    sendError(res, 401, 'Authentication required');
    return null;
  }
  if (!isOwnerUser(userId, deps)) {
    sendError(res, 403, 'Forbidden: Owner access required');
    return null;
  }
  return userId;
}

export const requireHost = requireAdminOrOwner;

export function redirectUriForProvider(deps: AppDeps, provider: string, req?: IncomingMessage): string {
  const base =
    deps.repo.getSetting('public_base_url') ??
    deps.config.publicBaseUrl ??
    (req
      ? getRequestBaseUrl(req, deps.config.publicBaseUrl, `${deps.config.host}:${deps.config.port}`)
      : `http://${deps.config.host}:${deps.config.port}`);
  return `${base.replace(/\/+$/, '')}/api/oauth/${encodeURIComponent(provider)}/callback`;
}
