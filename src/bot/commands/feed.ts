import { appDisplayName, type AppDeps } from '../../app.js';
import type { DiscordRestClient } from '../rest.js';
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionOption,
  type InteractionResponse,
} from '../types.js';

export const feedCommandDef: ApplicationCommand = {
  name: 'feed',
  description: 'Manage RSS/Atom and scrape feeds for this Discord server',
  options: [
    {
      name: 'add',
      description: 'Add a new feed and optionally configure a channel for automated delivery',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'name',
          description: 'Display name for the feed',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: 'url',
          description: 'RSS/Atom feed URL or webpage URL to scrape',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: 'channel',
          description: 'Discord text channel where updates should be posted',
          type: ApplicationCommandOptionType.CHANNEL,
          required: false,
        },
        {
          name: 'feed_type',
          description: 'Type of feed (default: rss)',
          type: ApplicationCommandOptionType.STRING,
          required: false,
          choices: [
            { name: 'RSS / Atom Feed', value: 'rss' },
            { name: 'Reddit Image Feed', value: 'reddit' },
            { name: 'Webpage Scraper', value: 'scrape' },
          ],
        },
      ],
    },
    {
      name: 'list',
      description: 'List all feeds configured for this Discord server',
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
    {
      name: 'remove',
      description: 'Remove a feed from this Discord server',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'id',
          description: 'The numeric ID or exact name of the feed to delete',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
    {
      name: 'poll',
      description: 'Trigger an immediate poll of a feed',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'id',
          description: 'The numeric ID or exact name of the feed to poll',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
    {
      name: 'toggle',
      description: 'Enable or pause automatic polling for a feed',
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: 'id',
          description: 'The numeric ID or exact name of the feed',
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: 'enabled',
          description: 'Enable (True) or Pause (False)',
          type: ApplicationCommandOptionType.BOOLEAN,
          required: true,
        },
      ],
    },
  ],
};

export async function handleFeedCommand(
  interaction: DiscordInteraction,
  deps: AppDeps,
  rest: DiscordRestClient,
): Promise<InteractionResponse> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: '❌ Feed commands can only be used inside a Discord server (guild).',
      },
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
      return handleAdd(subCommand.options ?? [], user.id, guildId, deps, rest, interaction);
    case 'list':
      return handleList(user.id, deps);
    case 'remove':
      return handleRemove(subCommand.options ?? [], user.id, deps);
    case 'poll':
      return handlePoll(subCommand.options ?? [], user.id, deps);
    case 'toggle':
      return handleToggle(subCommand.options ?? [], user.id, deps);
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { flags: 64, content: `Unknown feed subcommand: ${subCommand.name}` },
      };
  }
}

async function handleAdd(
  options: InteractionOption[],
  userId: number,
  guildId: string,
  deps: AppDeps,
  rest: DiscordRestClient,
  interaction: DiscordInteraction,
): Promise<InteractionResponse> {
  const name = String(options.find((o) => o.name === 'name')?.value ?? '').trim();
  const url = String(options.find((o) => o.name === 'url')?.value ?? '').trim();
  const channelOption = options.find((o) => o.name === 'channel')?.value as string | undefined;
  const targetChannelId = channelOption || interaction.channel_id || null;
  const rawType = options.find((o) => o.name === 'feed_type')?.value as string | undefined;
  const feedType = rawType === 'scrape' ? 'scrape' : rawType === 'reddit' ? 'reddit' : 'rss';

  if (!name || !url) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Name and URL are required to add a feed.' },
    };
  }

  try {
    const feed = deps.repo.addFeed(userId, name, url, targetChannelId, feedType, null, guildId);
    deps.repo.logActivity(
      userId,
      'info',
      'bot',
      `Added ${feedType === 'reddit' ? 'Reddit image ' : ''}feed "${name}" via Discord bot`,
    );

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '✅ Feed Added Successfully',
            color: 0x10b981,
            fields: [
              { name: 'Feed Name', value: feed.name, inline: true },
              { name: 'Feed ID', value: `#${feed.id}`, inline: true },
              { name: 'Type', value: feed.feedType.toUpperCase(), inline: true },
              {
                name: 'Target Channel',
                value: targetChannelId ? `<#${targetChannelId}>` : 'None',
                inline: true,
              },
              { name: 'Feed URL', value: `\`${feed.url}\``, inline: false },
            ],
            footer: {
              text: `${appDisplayName(deps)} • Direct Bot Delivery`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    };
  } catch (err) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Failed to save feed: ${(err as Error).message}` },
    };
  }
}

function handleList(userId: number, deps: AppDeps): InteractionResponse {
  const feeds = deps.repo.listFeeds(userId);

  if (feeds.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '📡 Feeds for this Server',
            description: 'No feeds configured yet. Use `/feed add` to configure your first RSS feed!',
            color: 0x06b6d4,
          },
        ],
      },
    };
  }

  const fields = feeds.slice(0, 25).map((f) => {
    const status = f.enabled ? '🟢 Enabled' : '⏸️ Paused';
    const lastChecked = f.lastCheckedAt ? new Date(f.lastCheckedAt).toLocaleString() : 'Never';
    const target = f.channelId ? `<#${f.channelId}>` : 'None';
    return {
      name: `#${f.id} — ${f.name} (${status})`,
      value: `**URL:** \`${f.url}\`\n**Channel:** ${target}\n**Last Checked:** ${lastChecked}`,
      inline: false,
    };
  });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `📡 Feeds for this Server (${feeds.length})`,
          fields,
          color: 0x06b6d4,
          footer: { text: `${appDisplayName(deps)} • Use /feed poll or /feed remove` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}

function handleRemove(options: InteractionOption[], userId: number, deps: AppDeps): InteractionResponse {
  const identifier = String(options.find((o) => o.name === 'id')?.value ?? '').trim();
  const feeds = deps.repo.listFeeds(userId);
  const feed = feeds.find((f) => String(f.id) === identifier || f.name.toLowerCase() === identifier.toLowerCase());

  if (!feed) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Feed "${identifier}" not found in this server.` },
    };
  }

  deps.repo.deleteFeed(userId, feed.id);
  deps.repo.logActivity(userId, 'info', 'bot', `Deleted feed "${feed.name}" via Discord bot`);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: '🗑️ Feed Deleted',
          description: `Removed feed **${feed.name}** (\`#${feed.id}\`).`,
          color: 0xef4444,
        },
      ],
    },
  };
}

async function handlePoll(options: InteractionOption[], userId: number, deps: AppDeps): Promise<InteractionResponse> {
  const identifier = String(options.find((o) => o.name === 'id')?.value ?? '').trim();
  const feeds = deps.repo.listFeeds(userId);
  const feed = feeds.find((f) => String(f.id) === identifier || f.name.toLowerCase() === identifier.toLowerCase());

  if (!feed) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Feed "${identifier}" not found in this server.` },
    };
  }

  try {
    await deps.feeds.pollFeed(userId, feed.id, true);
    const updated = deps.repo.getFeed(userId, feed.id);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: `🔄 Polled Feed: ${feed.name}`,
            color: 0x06b6d4,
            fields: [
              { name: 'Feed URL', value: feed.url, inline: false },
              {
                name: 'Last Checked',
                value: updated?.lastCheckedAt
                  ? `<t:${Math.floor(new Date(updated.lastCheckedAt).getTime() / 1000)}:R>`
                  : 'Just now',
                inline: true,
              },
              { name: 'Status', value: updated?.enabled ? '🟢 Enabled' : '⏸️ Disabled', inline: true },
            ],
            footer: { text: appDisplayName(deps) },
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
        content: `❌ Error polling feed: ${(err as Error).message}`,
      },
    };
  }
}

function handleToggle(options: InteractionOption[], userId: number, deps: AppDeps): InteractionResponse {
  const identifier = String(options.find((o) => o.name === 'id')?.value ?? '').trim();
  const enabled = Boolean(options.find((o) => o.name === 'enabled')?.value);

  const feeds = deps.repo.listFeeds(userId);
  const feed = feeds.find((f) => String(f.id) === identifier || f.name.toLowerCase() === identifier.toLowerCase());

  if (!feed) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: `❌ Feed "${identifier}" not found in this server.` },
    };
  }

  deps.repo.updateFeed(userId, feed.id, { enabled: enabled ? 1 : 0 });
  deps.repo.logActivity(userId, 'info', 'bot', `${enabled ? 'Enabled' : 'Paused'} feed "${feed.name}" via Discord bot`);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: enabled ? '▶️ Feed Resumed' : '⏸️ Feed Paused',
          description: `Feed **${feed.name}** (\`#${feed.id}\`) is now ${enabled ? '**enabled** and will be polled automatically.' : '**paused**.'}`,
          color: enabled ? 0x10b981 : 0xf59e0b,
        },
      ],
    },
  };
}
