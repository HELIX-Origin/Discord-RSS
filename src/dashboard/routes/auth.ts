import { randomBytes } from 'node:crypto';
import type { AppDeps } from '../../app.js';
import { AuthService } from '../../auth/service.js';
import {
  clearSessionCookie,
  getRequestBaseUrl,
  readBodyJson,
  sendError,
  sendJson,
  setSessionCookie,
} from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { DiscordProvider, hasManageChannelsPermission } from '../../oauth/discord.js';
import { createLogger } from '../../util/logger.js';
import { authedUserId, getDiscordCallbackUri, getSessionToken, SESSION_MAX_AGE_SECONDS } from './shared.js';

export function registerAuthRoutes(router: Router<AppDeps>, deps: AppDeps): void {
  const auth = new AuthService(deps.repo);

  router.add('POST', '/api/auth/register', async (req, res, _ctx, d) => {
    const body = (await readBodyJson(req)) as { email?: string; password?: string; displayName?: string };
    try {
      const result = auth.register(body.email ?? '', body.password ?? '', body.displayName);
      setSessionCookie(res, result.token, SESSION_MAX_AGE_SECONDS, req, d.config.publicBaseUrl);
      sendJson(res, 201, { user: result.user });
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : 'Registration failed');
    }
  });

  router.add('POST', '/api/auth/login', async (req, res, _ctx, d) => {
    const body = (await readBodyJson(req)) as { email?: string; password?: string };
    try {
      const result = auth.login(body.email ?? '', body.password ?? '');
      setSessionCookie(res, result.token, SESSION_MAX_AGE_SECONDS, req, d.config.publicBaseUrl);
      sendJson(res, 200, { user: result.user });
    } catch (err) {
      sendError(res, 401, err instanceof Error ? err.message : 'Login failed');
    }
  });

  router.add('POST', '/api/auth/logout', (req, res, _ctx, d) => {
    const token = getSessionToken(req);
    if (token) auth.logout(token);
    clearSessionCookie(res, req, d.config.publicBaseUrl);
    sendJson(res, 200, { ok: true });
  });

  router.add('GET', '/api/auth/me', async (req, res, _ctx, d) => {
    const userId = await authedUserId(req, d);
    if (userId === null) {
      sendJson(res, 401, { authenticated: false });
      return;
    }
    const user = d.repo.getUserById(userId);
    if (!user) {
      sendJson(res, 401, { authenticated: false });
      return;
    }
    sendJson(res, 200, {
      authenticated: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      oauthProviders: d.oauth.listProviders(),
      connections: d.oauth.connectionsFor(user.id).map((c) => ({
        provider: c.provider,
        accountId: c.providerAccountId,
        connectedAt: c.createdAt,
      })),
    });
  });

  // ---- Discord OAuth Login Initiation ----
  const startDiscordLogin = (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    d: AppDeps,
  ) => {
    const p = d.oauth.getProvider('discord');
    const config = d.oauth.getConfig('discord');
    if (!p || !config || !config.enabled || !config.clientId || !config.clientSecret) {
      sendError(
        res,
        400,
        'Discord OAuth is not configured. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET environment variables.',
      );
      return;
    }

    const redirectUri = getDiscordCallbackUri(d, req);

    const state = randomBytes(16).toString('hex');
    d.repo.saveOAuthState(state, null, 'discord');
    d.repo.cleanupExpiredOAuthStates(10 * 60 * 1000);

    const authUrl = p.buildAuthorizeUrl(redirectUri, state, config);

    const acceptHeader = req.headers['accept'] ?? '';
    if (acceptHeader.includes('application/json')) {
      sendJson(res, 200, { url: authUrl });
    } else {
      res.writeHead(302, { Location: authUrl });
      res.end();
    }
  };

  router.add('GET', '/api/auth/discord', (req, res, _ctx, d) => startDiscordLogin(req, res, d));
  router.add('GET', '/api/auth/login/discord', (req, res, _ctx, d) => startDiscordLogin(req, res, d));

  // ---- Discord OAuth Callback Handler ----
  router.add('GET', '/api/auth/callback/discord', async (req, res, _ctx, d) => {
    const baseUrl = getRequestBaseUrl(req, d.config.publicBaseUrl, `${d.config.host}:${d.config.port}`);
    const url = new URL(req.url ?? '/', baseUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderAuthErrorPage(`Discord authorization canceled or failed: ${errorParam}`));
      return;
    }

    if (!code || !state) {
      // If callback received with no code or state (e.g. direct bot ping), render default confirmation page
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Discord Authorization · HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-950 text-white min-h-screen flex items-center justify-center font-sans">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md text-center shadow-xl space-y-4">
    <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-2xl mb-2">
      <i class="fa-brands fa-discord"></i>
    </div>
    <h1 class="text-xl font-bold">Discord Authorization Completed</h1>
    <p class="text-sm text-gray-400">HELIX RSS Discord Bot authorization callback received successfully. You can now return to Discord or close this tab.</p>
  </div>
</body>
</html>`);
      return;
    }

    try {
      const oauthState = d.repo.consumeOAuthState(state);
      if (!oauthState || oauthState.provider !== 'discord') {
        throw new Error('Invalid or expired login session state. Please try logging in again.');
      }

      const p = d.oauth.getProvider('discord');
      const config = d.oauth.getConfig('discord');
      if (!p || !config) {
        throw new Error('Discord OAuth provider is not configured.');
      }

      const redirectUri = getDiscordCallbackUri(d, req);
      const tokens = await p.exchangeCode(code, redirectUri, config);

      let profile = {
        id: tokens.accountId,
        username: 'DiscordUser',
        displayName: 'Discord User',
        email: `${tokens.accountId}@discord.helix`,
      };

      let managedGuildIds: string[] = [];
      if (p instanceof DiscordProvider) {
        try {
          profile = await p.fetchUserProfile(tokens.accessToken);
          const guilds = await p.fetchUserGuilds(tokens.accessToken);
          managedGuildIds = guilds.filter((g) => hasManageChannelsPermission(g)).map((g) => g.id);
        } catch {
          /* use token-derived fallback profile */
        }
      }

      // Detect if this Discord user is the application owner / developer portal team admin
      let isAppTeam = false;
      if (d.bot) {
        if (d.bot.getOwnerDiscordIds().length === 0) {
          await d.bot.detectApplicationOwners();
        }
        isAppTeam = d.bot.isOwnerDiscordId(profile.id) || d.bot.isOwnerOrAdminDiscordId(profile.id);
      } else if (d.config.botToken) {
        try {
          const { DiscordRestClient } = await import('../../bot/rest.js');
          const restClient = new DiscordRestClient(d.config.botToken);
          const appInfo = await restClient.getCurrentApplication();
          if (appInfo.owner?.id === profile.id || appInfo.team?.owner_user_id === profile.id) {
            isAppTeam = true;
          }
          if (appInfo.team?.members) {
            for (const m of appInfo.team.members) {
              if (m.membership_state === 2 && m.user.id === profile.id) {
                isAppTeam = true;
                break;
              }
            }
          }
        } catch (err) {
          void err;
        }
      }

      // Look up existing user by Discord OAuth connection or email
      let user = null;
      const allUsers = d.repo.listUsers();
      for (const u of allUsers) {
        const conns = d.oauth.connectionsFor(u.id);
        if (conns.some((c) => c.provider === 'discord' && c.providerAccountId === profile.id)) {
          user = u;
          break;
        }
      }

      if (!user) {
        user = d.repo.getByEmail(profile.email);
      }

      const isFirstUser = allUsers.length === 0;
      const isAllowed =
        isAppTeam || isFirstUser || user?.role === 'owner' || user?.role === 'admin' || managedGuildIds.length > 0;

      if (!isAllowed) {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          renderAuthErrorPage(
            'Access Denied: You must be a server owner or have Manage Channels permissions in a Discord server to access HELIX RSS.',
          ),
        );
        return;
      }

      // If user still does not exist, create new account
      if (!user) {
        const role = isAppTeam ? 'owner' : isFirstUser ? 'owner' : 'member';
        user = d.repo.createUser(profile.email, '', profile.displayName, role);
      } else if (isAppTeam && user.role !== 'owner') {
        d.repo.setUserRole(user.id, 'owner');
        user = d.repo.getUserById(user.id) ?? user;
      }

      // Persist managed guild IDs for the user
      d.repo.setUserSetting(user.id, 'managed_guild_ids', JSON.stringify(managedGuildIds));

      // Create session for user
      const sessionToken = randomBytes(32).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
      d.repo.createSession(user.id, sessionToken, sessionExpiresAt);

      // Upsert Discord OAuth connection
      const tokenExpiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString() : null;

      d.repo.upsertOAuthConnection({
        userId: user.id,
        provider: 'discord',
        providerAccountId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokenExpiresAt,
      });

      setSessionCookie(res, sessionToken, SESSION_MAX_AGE_SECONDS, req, d.config.publicBaseUrl);
      d.repo.logActivity(user.id, 'info', 'auth', `User logged in via Discord (${profile.displayName})`);

      res.writeHead(302, { Location: '/' });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      const logger = createLogger('auth', d.config.logLevel);
      logger.error('Discord OAuth callback failed', { err: message });
      res.writeHead(302, { Location: `/login?error=${encodeURIComponent(message)}` });
      res.end();
    }
  });
}

export function renderAuthErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authentication Error · HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-950 text-white min-h-screen flex items-center justify-center font-sans p-4">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md text-center shadow-xl space-y-4">
    <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/60 text-red-400 border border-red-800 text-2xl mb-2">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
    <h1 class="text-xl font-bold">Discord Sign-In Failed</h1>
    <p class="text-sm text-gray-400">${escapeHtml(message)}</p>
    <div class="pt-2">
      <a href="/login" class="inline-flex items-center px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition">
        <i class="fa-solid fa-arrow-left mr-2"></i> Return to Login
      </a>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
