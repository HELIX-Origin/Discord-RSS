import type { AppDeps } from '../../app.js';
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';

export const bindCommandDef: ApplicationCommand = {
  name: 'bind',
  description: 'Link this Discord server to a Discord RSS web dashboard account',
  options: [
    {
      name: 'email',
      description: 'The email of the dashboard account to bind with',
      type: ApplicationCommandOptionType.STRING,
      required: false,
    },
  ],
};

export async function handleBindCommand(interaction: DiscordInteraction, deps: AppDeps): Promise<InteractionResponse> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { flags: 64, content: '❌ Bind command must be used inside a Discord server.' },
    };
  }

  const emailOption = interaction.data?.options?.find((o) => o.name === 'email')?.value;
  const email = emailOption ? String(emailOption).trim() : null;

  if (email) {
    const user = deps.repo.getByEmail(email);
    if (!user) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          content: `❌ No dashboard account found with email \`${email}\`. Register at the web dashboard first!`,
        },
      };
    }

    deps.repo.bindGuild(guildId, user.id);
    deps.repo.logActivity(user.id, 'info', 'bot', `Bound Discord server ${guildId} to account ${user.email}`);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '🔗 Account Bound Successfully',
            description: `This Discord server is now linked to dashboard account **${user.email}** (User ID #${user.id}). All feeds and webhooks created in this server will appear in that dashboard account.`,
            color: 0x57f287,
          },
        ],
      },
    };
  }

  // Show current binding
  const currentBinding = deps.repo.getGuildBinding(guildId);
  const currentUser = currentBinding ? deps.repo.getUserById(currentBinding.userId) : null;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: '🔗 Server Account Binding',
          description: currentUser
            ? `This server is currently linked to dashboard account: **${currentUser.email}** (ID #${currentUser.id}).\n\nTo link to a different account, use \`/bind email:your@email.com\`.`
            : `This server is using default automatic binding.\n\nTo link to a specific account, use \`/bind email:your@email.com\`.`,
          color: 0x5865f2,
        },
      ],
    },
  };
}
