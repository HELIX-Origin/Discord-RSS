import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  type ApplicationCommand,
  type ApplicationCommandOption,
  type DiscordEmbed,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';
import type { AppDeps } from '../../app.js';
import { ERROR_EMBED_COLOR, STANDARD_EMBED_COLOR, appBranding, brandAuthor, type AppBranding } from '../embeds.js';
import { aboutCommandDef } from './about.js';
import { feedCommandDef } from './feed.js';
import { statsCommandDef } from './stats.js';

export const helpCommandDef: ApplicationCommand = {
  name: 'help',
  description: 'List all available bot slash commands and their usage',
  options: [
    {
      name: 'command',
      description: 'Get detailed usage information for a specific command',
      type: ApplicationCommandOptionType.STRING,
      required: false,
    },
  ],
};

export const defaultCommands: ApplicationCommand[] = [feedCommandDef, statsCommandDef, aboutCommandDef, helpCommandDef];

function formatOptionSummary(option: ApplicationCommandOption): string {
  const req = option.required ? 'required' : 'optional';
  return `• \`${option.name}\` *(${req})* — ${option.description}`;
}

function buildCommandDetailEmbed(command: ApplicationCommand, branding: AppBranding): DiscordEmbed {
  const subcommands = command.options?.filter((opt) => opt.type === ApplicationCommandOptionType.SUB_COMMAND) ?? [];
  const directOptions = command.options?.filter((opt) => opt.type !== ApplicationCommandOptionType.SUB_COMMAND) ?? [];

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (subcommands.length > 0) {
    for (const sub of subcommands) {
      const subArgs =
        sub.options && sub.options.length > 0
          ? `\n**Options:**\n${sub.options.map(formatOptionSummary).join('\n')}`
          : '';
      fields.push({
        name: `/${command.name} ${sub.name}`,
        value: `${sub.description}${subArgs}`,
        inline: false,
      });
    }
  } else if (directOptions.length > 0) {
    fields.push({
      name: 'Options',
      value: directOptions.map(formatOptionSummary).join('\n'),
      inline: false,
    });
  }

  const usageHint =
    subcommands.length > 0
      ? `\`/${command.name} <subcommand> [options]\``
      : `\`/${command.name}${directOptions.length > 0 ? ' [options]' : ''}\``;

  const embed: DiscordEmbed = {
    author: brandAuthor(branding),
    title: `📖 Command: /${command.name}`,
    description: `**${command.description}**\n\n**Syntax:** ${usageHint}`,
    color: STANDARD_EMBED_COLOR,
    fields,
    footer: { text: `${branding.appName} • Slash Command Reference` },
    timestamp: new Date().toISOString(),
  };
  if (branding.iconUrl) {
    embed.thumbnail = { url: branding.iconUrl };
  }
  return embed;
}

function buildAllCommandsEmbed(commands: ApplicationCommand[], branding: AppBranding): DiscordEmbed {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = commands.map((cmd) => {
    const subcommands = cmd.options?.filter((opt) => opt.type === ApplicationCommandOptionType.SUB_COMMAND) ?? [];

    if (subcommands.length > 0) {
      const subList = subcommands.map((sub) => `• \`/${cmd.name} ${sub.name}\` — ${sub.description}`).join('\n');
      return {
        name: `/${cmd.name}`,
        value: `${cmd.description}\n\n**Subcommands:**\n${subList}`,
        inline: false,
      };
    }

    return {
      name: `/${cmd.name}`,
      value: `${cmd.description}\n\n**Usage:** \`/${cmd.name}\``,
      inline: false,
    };
  });

  const embed: DiscordEmbed = {
    author: brandAuthor(branding),
    title: `📖 ${branding.appName} Slash Commands`,
    description:
      'Here is a list of all available slash commands. Use `/help <command>` for detailed options and syntax.',
    color: STANDARD_EMBED_COLOR,
    fields,
    footer: { text: `${branding.appName} • Type / in chat to run any command` },
    timestamp: new Date().toISOString(),
  };
  if (branding.iconUrl) {
    embed.thumbnail = { url: branding.iconUrl };
  }
  return embed;
}

export async function handleHelpCommand(
  interaction: DiscordInteraction,
  commands: ApplicationCommand[] = defaultCommands,
  deps: AppDeps,
): Promise<InteractionResponse> {
  const branding = appBranding(deps);
  const appName = branding.appName;
  const commandOpt = interaction.data?.options?.find((opt) => opt.name === 'command');
  const query =
    typeof commandOpt?.value === 'string' ? commandOpt.value.trim().replace(/^\/+/, '').toLowerCase() : null;

  if (query) {
    const target = commands.find((cmd) => cmd.name.toLowerCase() === query);
    if (target) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [buildCommandDetailEmbed(target, branding)],
        },
      };
    }

    const availableNames = commands.map((c) => `\`/${c.name}\``).join(', ');
    const notFoundEmbed: DiscordEmbed = {
      author: brandAuthor(branding),
      title: '❓ Command Not Found',
      description: `Could not find a command named \`/${query}\`.\n\n**Available commands:** ${availableNames}\n\nUse \`/help\` to view all commands.`,
      color: ERROR_EMBED_COLOR,
      footer: { text: `${appName} • Slash Command Reference` },
      timestamp: new Date().toISOString(),
    };
    if (branding.iconUrl) {
      notFoundEmbed.thumbnail = { url: branding.iconUrl };
    }
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [notFoundEmbed],
      },
    };
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [buildAllCommandsEmbed(commands, branding)],
    },
  };
}
