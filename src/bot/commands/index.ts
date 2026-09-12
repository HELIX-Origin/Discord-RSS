import type { AppDeps } from '../../app.js';
import type { DiscordRestClient } from '../rest.js';
import {
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';
import { aboutCommandDef, handleAboutCommand } from './about.js';
import { feedCommandDef, handleFeedCommand } from './feed.js';
import { handleHelpCommand, helpCommandDef } from './help.js';
import { handleStatsCommand, statsCommandDef } from './stats.js';

export const allBotCommands: ApplicationCommand[] = [feedCommandDef, statsCommandDef, aboutCommandDef, helpCommandDef];

export async function dispatchInteraction(
  interaction: DiscordInteraction,
  deps: AppDeps,
  rest: DiscordRestClient,
): Promise<InteractionResponse> {
  const commandName = interaction.data?.name;

  switch (commandName) {
    case 'feed':
      return handleFeedCommand(interaction, deps, rest);
    case 'stats':
      return handleStatsCommand(interaction, deps);
    case 'about':
      return handleAboutCommand(interaction, deps);
    case 'help':
      return handleHelpCommand(interaction, allBotCommands, deps);
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: 64,
          content: `❌ Unknown command: /${commandName}`,
        },
      };
  }
}
