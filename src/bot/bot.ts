import type http from 'node:http';
import type https from 'node:https';
import type { AppDeps } from '../app.js';
import { createLogger, type Logger } from '../util/logger.js';
import { allBotCommands, dispatchInteraction } from './commands/index.js';
import { DiscordGatewayClient } from './gateway.js';
import { DiscordRestClient } from './rest.js';
import { InteractionResponseType, type DiscordInteraction } from './types.js';
import { createHelixRssServer } from '../dashboard/server.js';

export interface DiscordBotOptions {
  token: string;
  clientId: string | null;
  redirectUrl: string | null;
  callbackUrl?: string | null;
  port?: number;
  host?: string;
  sslKey?: string | null;
  sslCert?: string | null;
  startSite?: boolean;
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
    this.rest = new DiscordRestClient(options.token, deps.config.discordApiBaseUrl);
    this.gateway = new DiscordGatewayClient({
      token: options.token,
      logger: this.logger,
      onInteraction: (interaction) => this.handleInteraction(interaction),
      onGuildDelete: (guildId) => this.handleGuildDelete(guildId),
    });
    this.deps.bot = this;
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    this.logger.info('Starting Discord Bot primary service...');

    if (this.options.token) {
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
    } else {
      this.logger.warn('DISCORD_TOKEN not set; running bot in local web-only mode without Discord Gateway connection.');
    }

    // 3. Start unified HTTP/HTTPS server on bot port (e.g. 3131)
    if (this.options.port !== undefined && this.options.port >= 0) {
      const port = this.options.port;
      const host = this.options.host ?? '127.0.0.1';
      const server = createHelixRssServer(this.deps);
      this.server = server;

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          this.logger.error(`Discord Bot port ${port} on ${host} is already in use.`);
        } else {
          this.logger.error('Discord Bot server error', { err: err.message });
        }
      });

      await new Promise<void>((resolve, reject) => {
        const onListening = () => {
          server.removeListener('error', onError);
          const address = server.address();
          if (typeof address === 'object' && address) {
            this.deps.config.port = address.port;
            this.deps.config.botPort = address.port;
          }
          this.logger.info('HELIX RSS unified server listening', {
            host,
            port: this.deps.config.port,
          });
          resolve();
        };

        const onError = (err: NodeJS.ErrnoException) => {
          server.removeListener('listening', onListening);
          reject(err);
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
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

  async handleGuildDelete(guildId: string): Promise<void> {
    this.logger.info('Handling GUILD_DELETE: Bot removed from guild or guild deleted', { guildId });
    try {
      const result = this.deps.repo.deleteGuildData(guildId);
      this.logger.info(`Cleaned up guild ${guildId} data`, {
        feedsDeleted: result.feedsDeleted,
        guildsDeleted: result.guildsDeleted,
      });
    } catch (err) {
      this.logger.error('Failed to clean up guild data after GUILD_DELETE', {
        guildId,
        err: (err as Error).message,
      });
    }
  }

  private cachedGuildsWithChannels: Array<{
    id: string;
    name: string;
    icon: string | null;
    channels: Array<{ id: string; name: string; type: number; position?: number }>;
  }> | null = null;
  private cachedGuildsTimestamp = 0;

  async getGuildsWithChannels(): Promise<
    Array<{
      id: string;
      name: string;
      icon: string | null;
      channels: Array<{ id: string; name: string; type: number; position?: number }>;
    }>
  > {
    const now = Date.now();
    if (this.cachedGuildsWithChannels && now - this.cachedGuildsTimestamp < 15_000) {
      return this.cachedGuildsWithChannels;
    }

    try {
      const guilds = await this.rest.getBotGuilds();
      const results = await Promise.all(
        guilds.map(async (guild) => {
          try {
            const channels = await this.rest.getGuildChannels(guild.id);
            return {
              id: guild.id,
              name: guild.name,
              icon: guild.icon,
              channels,
            };
          } catch {
            return {
              id: guild.id,
              name: guild.name,
              icon: guild.icon,
              channels: [],
            };
          }
        }),
      );
      this.cachedGuildsWithChannels = results;
      this.cachedGuildsTimestamp = now;
      return results;
    } catch {
      return this.cachedGuildsWithChannels ?? [];
    }
  }

  async sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void> {
    await this.rest.sendChannelMessage(channelId, payload);
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
