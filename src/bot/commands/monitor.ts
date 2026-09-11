import type { AppDeps } from '../../app.js';
import type { DiscordRestClient } from '../rest.js';
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionOption,
  type InteractionResponse,
} from '../types.js';

export const monitorCommandDef: ApplicationCommand = {
  name: 'monitor',
  description: 'Manage website uptime and status monitors',
  options: [
    {
      name: 'add',
      description: 'Add a new website monitor with transition alerts',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'name',
          description: 'Display name for the website monitor',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: 'url',
          description: 'Website HTTP/HTTPS URL to monitor',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: 'channel',
          description: 'Discord channel to alert when status changes (online <-> down)',
          type: ApplicationCommandOptionType.CHANNEL,
          required: false,
        },
      ],
    },
    {
      name: 'list',
      description: 'List all website status monitors for this server',
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
    {
      name: 'remove',
      description: 'Delete a website status monitor',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'id',
          description: 'The numeric ID or exact name of the monitor',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
    {
      name: 'check',
      description: 'Perform an immediate health check on a monitor',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'id',
          description: 'The numeric ID or exact name of the monitor',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
  ],
};

export async function handleMonitorCommand(
  interaction: DiscordInteraction,
  deps: AppDeps,
  rest: DiscordRestClient,
): Promise<InteractionResponse> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Monitor commands must be run inside a server.' },
    };
  }

  const user = deps.repo.getOrCreateGuildUser(guildId);
  const subCommand = interaction.data?.options?.[0];
  if (!subCommand) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Invalid subcommand.' },
    };
  }

  switch (subCommand.name) {
    case 'add':
      return handleAdd(subCommand.options ?? [], user.id, deps, rest, interaction);
    case 'list':
      return handleList(user.id, deps);
    case 'remove':
      return handleRemove(subCommand.options ?? [], user.id, deps);
    case 'check':
      return handleCheck(subCommand.options ?? [], user.id, deps);
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { flags: 64, content: `Unknown monitor subcommand: ${subCommand.name}` },
      };
  }
}

async function handleAdd(
  options: InteractionOption[],
  userId: number,
  deps: AppDeps,
  rest: DiscordRestClient,
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const name = String(options.find((o) => o.name === 'name')?.value ?? '').trim();
  const url = String(options.find((o) => o.name === 'url')?.value ?? '').trim();
  const channelOption = options.find((o) => o.name === 'channel')?.value as string | undefined;
  const targetChannelId = channelOption || interaction.channel_id || null;

  if (!name || !url) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Name and URL are required.' },
    };
  }

  try {
    const monitor = deps.repo.addMonitor(userId, name, url, targetChannelId);
    deps.repo.logActivity(userId, 'info', 'bot', `Added monitor "${name}" via Discord bot`);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '🌐 Monitor Added',
            color: 0x57f287,
            fields: [
              { name: 'Name', value: monitor.name, inline: true },
              { name: 'ID', value: `#${monitor.id}`, inline: true },
              {
                name: 'Alert Channel',
                value: targetChannelId ? `<#${targetChannelId}>` : 'None',
                inline: true,
              },
              { name: 'URL', value: `\`${monitor.url}\``, inline: false },
            ],
            footer: { text: 'HELIX RSS • Checked automatically every interval' },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  } catch (err) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Failed to add monitor: ${(err as Error).message}` },
    };
  }
}

function handleList(userId: number, deps: AppDeps): InteractionResponse {
  const monitors = deps.repo.listMonitors(userId);

  if (monitors.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '🌐 Website Status Monitors',
            description: 'No monitors configured yet. Use `/monitor add` to start tracking website uptime!',
            color: 0x5865f2,
          },
        ],
      },
    };
  }

  const fields = monitors.map((m) => {
    const statusEmoji = m.status === 'online' ? '🟢 Online' : m.status === 'down' ? '🔴 Down' : '⚪ Unknown';
    const lastChecked = m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleString() : 'Never';
    return {
      name: `#${m.id} — ${m.name} (${statusEmoji})`,
      value: `**URL:** \`${m.url}\`\n**Last Checked:** ${lastChecked}`,
      inline: false,
    };
  });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `🌐 Status Monitors (${monitors.length})`,
          fields,
          color: 0x5865f2,
          footer: { text: 'HELIX RSS' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}

function handleRemove(options: InteractionOption[], userId: number, deps: AppDeps): InteractionResponse {
  const identifier = String(options.find((o) => o.name === 'id')?.value ?? '').trim();
  const monitors = deps.repo.listMonitors(userId);
  const monitor = monitors.find(
    (m) => String(m.id) === identifier || m.name.toLowerCase() === identifier.toLowerCase(),
  );

  if (!monitor) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Monitor "${identifier}" not found in this server.` },
    };
  }

  deps.repo.deleteMonitor(userId, monitor.id);
  deps.repo.logActivity(userId, 'info', 'bot', `Deleted monitor "${monitor.name}" via Discord bot`);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: '🗑️ Monitor Deleted',
          description: `Removed monitor **${monitor.name}** (\`#${monitor.id}\`).`,
          color: 0xed4245,
        },
      ],
    },
  };
}

async function handleCheck(options: InteractionOption[], userId: number, deps: AppDeps): Promise<InteractionResponse> {
  const identifier = String(options.find((o) => o.name === 'id')?.value ?? '').trim();
  const monitors = deps.repo.listMonitors(userId);
  const monitor = monitors.find(
    (m) => String(m.id) === identifier || m.name.toLowerCase() === identifier.toLowerCase(),
  );

  if (!monitor) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Monitor "${identifier}" not found in this server.` },
    };
  }

  try {
    await deps.status.checkMonitor(userId, monitor.id);
    const updated = deps.repo.getMonitor(userId, monitor.id);
    const isOnline = updated?.status === 'online';

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: `🌐 Check Result: ${monitor.name}`,
            color: isOnline ? 0x57f287 : 0xed4245,
            fields: [
              { name: 'Status', value: isOnline ? '🟢 Online' : '🔴 Down', inline: true },
              { name: 'Target URL', value: monitor.url, inline: false },
              {
                name: 'Last Checked',
                value: updated?.lastCheckedAt
                  ? `<t:${Math.floor(new Date(updated.lastCheckedAt).getTime() / 1000)}:R>`
                  : 'Just now',
                inline: true,
              },
            ],
            footer: { text: 'HELIX RSS' },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  } catch (err) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Error checking monitor: ${(err as Error).message}` },
    };
  }
}
