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

export const webhookCommandDef: ApplicationCommand = {
  name: 'webhook',
  description: 'Manage Discord delivery webhooks',
  options: [
    {
      name: 'create',
      description: 'Create a new Discord webhook for a channel and register it',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'name',
          description: 'Display name for the webhook in Discord RSS',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: 'channel',
          description: 'Discord text channel to create the webhook in',
          type: ApplicationCommandOptionType.CHANNEL,
          required: true,
        },
      ],
    },
    {
      name: 'list',
      description: 'List all registered webhooks for this server',
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
  ],
};

export async function handleWebhookCommand(
  interaction: DiscordInteraction,
  deps: AppDeps,
  rest: DiscordRestClient,
): Promise<InteractionResponse> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Webhook commands must be run inside a server.' },
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
    case 'create':
      return handleCreate(subCommand.options ?? [], user.id, deps, rest);
    case 'list':
      return handleList(user.id, deps);
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { flags: 64, content: `Unknown webhook subcommand: ${subCommand.name}` },
      };
  }
}

async function handleCreate(
  options: InteractionOption[],
  userId: number,
  deps: AppDeps,
  rest: DiscordRestClient,
): Promise<InteractionResponse> {
  const name = String(options.find((o) => o.name === 'name')?.value ?? '').trim();
  const channelId = String(options.find((o) => o.name === 'channel')?.value ?? '').trim();

  if (!name || !channelId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Name and channel are required.' },
    };
  }

  try {
    const payload = await rest.createChannelWebhook(channelId, name, 'Created via HELIX RSS Bot /webhook create');

    if (!payload.url) {
      throw new Error('Discord did not return a webhook URL');
    }

    const webhook = deps.repo.addWebhook(userId, name, payload.url);
    deps.repo.logActivity(userId, 'info', 'bot', `Created webhook "${name}" in channel <#${channelId}>`);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '🔗 Webhook Created & Registered',
            color: 0x57f287,
            fields: [
              { name: 'Name', value: webhook.name, inline: true },
              { name: 'ID', value: `#${webhook.id}`, inline: true },
              { name: 'Channel', value: `<#${channelId}>`, inline: true },
            ],
            footer: { text: 'HELIX RSS • Ready to link with feeds' },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  } catch (err) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: `❌ Failed to create webhook: ${(err as Error).message}`,
      },
    };
  }
}

function handleList(userId: number, deps: AppDeps): InteractionResponse {
  const webhooks = deps.repo.listWebhooks(userId);

  if (webhooks.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '🔗 Webhooks for this Server',
            description: 'No webhooks registered yet. Use `/webhook create` to create one!',
            color: 0x5865f2,
          },
        ],
      },
    };
  }

  const fields = webhooks.map((w) => ({
    name: `#${w.id} — ${w.name}`,
    value: `**Status:** ${w.enabled ? '🟢 Enabled' : '⏸️ Disabled'}\n**Created:** ${new Date(w.createdAt).toLocaleDateString()}`,
    inline: false,
  }));

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `🔗 Webhooks for this Server (${webhooks.length})`,
          fields,
          color: 0x5865f2,
          footer: { text: 'HELIX RSS' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}
