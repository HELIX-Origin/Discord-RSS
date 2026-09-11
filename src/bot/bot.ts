import http from 'node:http';
import https from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import type { AppDeps } from '../app.js';
import { createLogger, type Logger } from '../util/logger.js';
import { allBotCommands, dispatchInteraction } from './commands/index.js';
import { DiscordGatewayClient } from './gateway.js';
import { DiscordRestClient } from './rest.js';
import { InteractionResponseType, type DiscordInteraction } from './types.js';

export interface DiscordBotOptions {
  token: string;
  clientId: string | null;
  redirectUrl: string | null;
  callbackUrl?: string | null;
  port?: number;
  host?: string;
  sslKey?: string | null;
  sslCert?: string | null;
}

export class DiscordBot {
  private readonly logger: Logger;
  readonly rest: DiscordRestClient;
  private readonly gateway: DiscordGatewayClient;
  private server: http.Server | https.Server | null = null;
  private isStarted = false;
  private ownerDiscordIds = new Set<string>();
  private teamAdminDiscordIds = new Set<string>();

  constructor(
    private readonly deps: AppDeps,
    private readonly options: DiscordBotOptions,
  ) {
    this.logger = createLogger('bot', deps.config.logLevel);
    this.rest = new DiscordRestClient(options.token);
    this.gateway = new DiscordGatewayClient({
      token: options.token,
      logger: this.logger,
      onInteraction: (interaction) => this.handleInteraction(interaction),
    });
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    this.logger.info('Starting Discord Bot service...');

    // 0. Auto-detect owner and team permissions from Discord Application API
    await this.detectApplicationOwners();

    // 1. Register application slash commands with Discord REST API if clientId is available
    if (this.options.clientId) {
      try {
        this.logger.info('Registering global slash commands with Discord...', {
          commandsCount: allBotCommands.length,
          clientId: this.options.clientId,
        });
        await this.rest.registerGlobalCommands(this.options.clientId, allBotCommands);
        this.logger.info('Global slash commands registered successfully');
      } catch (err) {
        this.logger.error('Failed to register global slash commands', {
          err: (err as Error).message,
        });
      }
    } else {
      this.logger.warn(
        'DISCORD_CLIENT_ID not set; skipping automatic slash command registration. Set DISCORD_CLIENT_ID in .env to register commands.',
      );
    }

    // 2. Connect to Discord Gateway
    this.gateway.connect();

    // 3. Start local HTTP/HTTPS endpoint on DISCORD_PORT (e.g. 3131)
    if (this.options.port !== undefined && this.options.port >= 0) {
      const port = this.options.port;
      const host = this.options.host ?? '127.0.0.1';
      const keyConfig = this.options.sslKey ?? this.deps.config.botSslKey;
      const certConfig = this.options.sslCert ?? this.deps.config.botSslCert;
      let tlsOptions: { key: string; cert: string } | null = null;
      if (keyConfig && certConfig) {
        try {
          const key = existsSync(keyConfig) ? readFileSync(keyConfig, 'utf8') : keyConfig;
          const cert = existsSync(certConfig) ? readFileSync(certConfig, 'utf8') : certConfig;
          tlsOptions = { key, cert };
        } catch {
          tlsOptions = null;
        }
      }

      const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        const proto = tlsOptions ? 'https' : 'http';
        const url = new URL(req.url ?? '/', `${proto}://${req.headers.host ?? `${host}:${port}`}`);
        if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'helix-rss-bot', proto, uptime: process.uptime() }));
          return;
        }

        if (
          req.method === 'GET' &&
          (url.pathname === '/api/auth/callback/discord' || url.pathname === '/api/oauth/discord/callback')
        ) {
          if (url.searchParams.has('code')) {
            const mainProto =
              this.deps.config.publicBaseUrl?.startsWith('https') ||
              (this.deps.config.sslKey && this.deps.config.sslCert)
                ? 'https'
                : 'http';
            const mainHost = this.deps.config.host === '0.0.0.0' ? '127.0.0.1' : this.deps.config.host;
            const mainPort = this.deps.config.port;
            const baseUrl = this.deps.config.publicBaseUrl
              ? this.deps.config.publicBaseUrl.replace(/\/+$/, '')
              : `${mainProto}://${mainHost}:${mainPort}`;
            res.writeHead(302, {
              Location: `${baseUrl}/api/auth/callback/discord?${url.searchParams.toString()}`,
            });
            res.end();
            return;
          }

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

        if (req.method === 'POST' && (url.pathname === '/' || url.pathname === '/interactions')) {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const interaction = JSON.parse(body) as DiscordInteraction;
              if (interaction.type === 1) {
                // PING -> PONG
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ type: 1 }));
                return;
              }
              const response = await dispatchInteraction(interaction, this.deps, this.rest);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(response));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: (err as Error).message }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      };

      this.server = tlsOptions ? https.createServer(tlsOptions, requestHandler) : http.createServer(requestHandler);

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          this.logger.error(`Discord Bot port ${port} on ${host} is already in use.`);
        } else {
          this.logger.error('Discord Bot server error', { err: err.message });
        }
      });

      await new Promise<void>((resolve) => {
        this.server?.listen(port, host, () => {
          this.logger.info('Discord Bot server listening', {
            host,
            port,
            proto: tlsOptions ? 'https' : 'http',
          });
          resolve();
        });
      });
    }
  }

  private async handleInteraction(interaction: DiscordInteraction): Promise<void> {
    // Only handle application command interactions
    if (interaction.type !== 2) return;

    this.logger.debug('Received slash command interaction', {
      command: interaction.data?.name,
      guildId: interaction.guild_id,
      user: interaction.member?.user?.username ?? interaction.user?.username,
    });

    try {
      const response = await dispatchInteraction(interaction, this.deps, this.rest);
      await this.rest.sendInteractionResponse(interaction.id, interaction.token, response);
    } catch (err) {
      this.logger.error('Error dispatching slash command interaction', {
        err: (err as Error).message,
        command: interaction.data?.name,
      });

      try {
        await this.rest.sendInteractionResponse(interaction.id, interaction.token, {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: 64,
            content: `❌ An unexpected error occurred: ${(err as Error).message}`,
          },
        });
      } catch {
        /* ignore fallback failure */
      }
    }
  }

  async getGuildsWithChannels(): Promise<
    Array<{
      id: string;
      name: string;
      icon: string | null;
      channels: Array<{ id: string; name: string; type: number; position?: number }>;
    }>
  > {
    try {
      const guilds = await this.rest.getBotGuilds();
      const results = [];
      for (const guild of guilds) {
        try {
          const channels = await this.rest.getGuildChannels(guild.id);
          results.push({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            channels,
          });
        } catch {
          results.push({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            channels: [],
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async createChannelWebhook(
    channelId: string,
    name: string,
    reason?: string,
  ): Promise<{ id: string; name: string; url: string }> {
    const wh = await this.rest.createChannelWebhook(channelId, name, reason);
    return {
      id: wh.id,
      name: wh.name,
      url: wh.url ?? '',
    };
  }

  async detectApplicationOwners(): Promise<{ ownerIds: string[]; adminIds: string[] }> {
    try {
      const app = await this.rest.getCurrentApplication();
      const owners = new Set<string>();
      const admins = new Set<string>();

      if (app.owner?.id) {
        owners.add(app.owner.id);
      }

      if (app.team) {
        if (app.team.owner_user_id) {
          owners.add(app.team.owner_user_id);
        }
        for (const m of app.team.members || []) {
          if (m.membership_state === 2) {
            // ACCEPTED: The entire app team is the admin team by default
            owners.add(m.user.id);
            admins.add(m.user.id);
          }
        }
      }

      this.ownerDiscordIds = owners;
      this.teamAdminDiscordIds = admins;
      this.logger.info('Detected Discord Application Team from Portal', {
        teamCount: owners.size,
        teamIds: Array.from(owners),
      });

      return {
        ownerIds: Array.from(owners),
        adminIds: Array.from(admins),
      };
    } catch (err) {
      this.logger.warn('Could not auto-detect application owner from Discord API', {
        err: (err as Error).message,
      });
      return { ownerIds: [], adminIds: [] };
    }
  }

  getOwnerDiscordIds(): string[] {
    return Array.from(this.ownerDiscordIds);
  }

  isOwnerDiscordId(discordUserId: string): boolean {
    return this.ownerDiscordIds.has(discordUserId);
  }

  isOwnerOrAdminDiscordId(discordUserId: string): boolean {
    return this.ownerDiscordIds.has(discordUserId) || this.teamAdminDiscordIds.has(discordUserId);
  }

  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    this.gateway.stop();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.logger.info('Discord Bot stopped');
  }
}
