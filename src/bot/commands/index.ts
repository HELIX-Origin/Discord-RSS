import type { AppDeps } from '../../app.js';
import type { DiscordRestClient } from '../rest.js';
import {
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';
import { feedCommandDef, handleFeedCommand } from './feed.js';
import { handleWebhookCommand, webhookCommandDef } from './webhook.js';
import { handleMonitorCommand, monitorCommandDef } from './monitor.js';
import { handleStatsCommand, statsCommandDef } from './stats.js';
import { bindCommandDef, handleBindCommand } from './bind.js';

export const allBotCommands: ApplicationCommand[] = [
  feedCommandDef,
  webhookCommandDef,
  monitorCommandDef,
  statsCommandDef,
  bindCommandDef,
];

export async function dispatchInteraction(
  interaction: DiscordInteraction,
  deps: AppDeps,
  rest: DiscordRestClient,
): Promise<InteractionResponse> {
  const commandName = interaction.data?.name;

  switch (commandName) {
    case 'feed':
      return handleFeedCommand(interaction, deps, rest);
    case 'webhook':
      return handleWebhookCommand(interaction, deps, rest);
    case 'monitor':
      return handleMonitorCommand(interaction, deps, rest);
    case 'stats':
      return handleStatsCommand(interaction, deps);
    case 'bind':
      return handleBindCommand(interaction, deps);
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
