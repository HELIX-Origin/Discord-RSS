import { appDisplayName, type AppDeps } from '../../app.js';
import {
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';

export const statsCommandDef: ApplicationCommand = {
  name: 'stats',
  description: 'View HELIX RSS service statistics, bot details, and dashboard info',
};

export async function handleStatsCommand(interaction: DiscordInteraction, deps: AppDeps): Promise<InteractionResponse> {
  const stats = deps.db.stats();
  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  const guildId = interaction.guild_id;
  let guildFeedsCount = 0;
  if (guildId) {
    const user = deps.repo.getOrCreateGuildUser(guildId);
    guildFeedsCount = deps.repo.listFeeds(user.id).length;
  }

  const inviteUrl = deps.config.redirectUrl || 'Not configured';

  const dashboardUrl = deps.config.publicBaseUrl || `http://${deps.config.host}:${deps.config.port}`;

  const appName = appDisplayName(deps);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `📊 ${appName} Service Status`,
          color: 0x06b6d4,
          fields: [
            {
              name: '📡 This Server',
              value: `**Feeds:** ${guildFeedsCount}`,
              inline: true,
            },
            {
              name: '🌐 Global Totals',
              value: `**Feeds:** ${stats.feedCount}\n**Entries Sent:** ${stats.sentCount}`,
              inline: true,
            },
            {
              name: '⚙️ System Health',
              value: `**Uptime:** ${uptimeStr}\n**DB Size:** ${(stats.dbSizeBytes / 1024).toFixed(1)} KB\n**Redis:** ${deps.redis ? '🟢 Connected' : '⚪ Single-instance'}`,
              inline: true,
            },
            {
              name: '🖥️ Web Dashboard',
              value: `[Open Dashboard](${dashboardUrl})`,
              inline: true,
            },
            {
              name: '🤖 Bot Invite',
              value:
                deps.config.redirectUrl !== null
                  ? `[Invite Bot to Other Servers](${inviteUrl})`
                  : 'Set `DISCORD_REDIRECT_URL` in .env',
              inline: true,
            },
          ],
          footer: { text: `${appName} • Service Status` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}
