import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppDeps } from '../../app.js';
import { COOKIE_NAME, parseCookies, sendError } from '../../http/helpers.js';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3600;

export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSessionToken(req: IncomingMessage): string {
  return parseCookies(req)[COOKIE_NAME] ?? '';
}

export async function authedUserId(req: IncomingMessage, deps: AppDeps): Promise<number | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  const user = deps.repo.getUserBySessionToken(token);
  return user ? user.id : null;
}

export async function requireUser(req: IncomingMessage, res: ServerResponse, deps: AppDeps): Promise<number | null> {
  const userId = await authedUserId(req, deps);
  if (userId === null) sendError(res, 401, 'Authentication required');
  return userId;
}

export function redirectUriForProvider(deps: AppDeps, provider: string): string {
  const base =
    deps.repo.getSetting('public_base_url') ??
    deps.config.publicBaseUrl ??
    `http://${deps.config.host}:${deps.config.port}`;
  return `${base.replace(/\/+$/, '')}/api/oauth/${encodeURIComponent(provider)}/callback`;
}
