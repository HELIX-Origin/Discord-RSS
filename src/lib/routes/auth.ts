import type { AppDeps } from '../../app.js';
import { AuthService } from '../../auth/service.js';
import { clearSessionCookie, readBodyJson, sendError, sendJson, setSessionCookie } from '../../http/helpers.js';
import type { Router } from '../../http/router.js';
import { authedUserId, getSessionToken, SESSION_MAX_AGE_SECONDS } from './shared.js';

export function registerAuthRoutes(router: Router<AppDeps>, deps: AppDeps): void {
  const auth = new AuthService(deps.repo);

  router.add('POST', '/api/auth/register', async (req, res, _ctx, _d) => {
    const body = (await readBodyJson(req)) as { email?: string; password?: string; displayName?: string };
    try {
      const result = auth.register(body.email ?? '', body.password ?? '', body.displayName);
      setSessionCookie(res, result.token, SESSION_MAX_AGE_SECONDS);
      sendJson(res, 201, { user: result.user });
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : 'Registration failed');
    }
  });

  router.add('POST', '/api/auth/login', async (req, res, _ctx, _d) => {
    const body = (await readBodyJson(req)) as { email?: string; password?: string };
    try {
      const result = auth.login(body.email ?? '', body.password ?? '');
      setSessionCookie(res, result.token, SESSION_MAX_AGE_SECONDS);
      sendJson(res, 200, { user: result.user });
    } catch (err) {
      sendError(res, 401, err instanceof Error ? err.message : 'Login failed');
    }
  });

  router.add('POST', '/api/auth/logout', (req, res) => {
    const token = getSessionToken(req);
    if (token) auth.logout(token);
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
  });

  router.add('GET', '/api/auth/me', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      sendJson(res, 401, { authenticated: false });
      return;
    }
    const user = d.repo.getUserById(userId)!;
    sendJson(res, 200, {
      authenticated: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      oauthProviders: d.oauth.listProviders(),
      connections: d.oauth.connectionsFor(user.id).map((c) => ({
        provider: c.provider,
        accountId: c.providerAccountId,
        connectedAt: c.createdAt,
      })),
    });
  });
}
