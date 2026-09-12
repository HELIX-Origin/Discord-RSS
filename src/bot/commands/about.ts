import type { AppDeps } from '../../app.js';
import {
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordEmbed,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';
import { STANDARD_EMBED_COLOR, appBranding, brandAuthor } from '../embeds.js';

export const aboutCommandDef: ApplicationCommand = {
  name: 'about',
  description: 'About HELIX RSS and its capabilities',
};

export async function handleAboutCommand(
  _interaction: DiscordInteraction,
  deps: AppDeps,
): Promise<InteractionResponse> {
  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  const dashboardUrl = deps.config.publicBaseUrl || `http://${deps.config.host}:${deps.config.port}`;
  const inviteUrl = deps.config.redirectUrl;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: '📡 RSS & Atom Feeds',
      value: 'Automatic polling, deduplication, and rich embeds with primary images',
      inline: true,
    },
    {
      name: '📣 Direct Channel Delivery',
      value: 'Dispatches updates straight to designated Discord channels',
      inline: true,
    },
    {
      name: '🕸️ Webpage Scraper',
      value: 'Automated updates for websites lacking native RSS/Atom feeds',
      inline: true,
    },
    {
      name: '🎛️ Web Dashboard',
      value: 'Light & Dark themes with live logs and feed controls',
      inline: true,
    },
    {
      name: '⚙️ Runtime',
      value: 'Native Node.js & TypeScript ESM (zero runtime dependencies)',
      inline: true,
    },
    {
      name: '💾 Storage',
      value: 'In-memory AppState with SQLite write-through persistence',
      inline: true,
    },
    {
      name: '⏱️ Uptime',
      value: uptimeStr,
      inline: true,
    },
    {
      name: '🖥️ Dashboard Link',
      value: `[Open Dashboard](${dashboardUrl})`,
      inline: true,
    },
    ...(deps.config.repoUrl
      ? [
          {
            name: '📂 Source Code',
            value: `[${deps.config.repoUrl.replace(/^https?:\/\//i, '')}](${deps.config.repoUrl})`,
            inline: true,
          },
        ]
      : []),
  ];

  if (inviteUrl) {
    fields.push({
      name: '🤖 Bot Invite',
      value: `[Add Bot to Server](${inviteUrl})`,
      inline: true,
    });
  }

  const branding = appBranding(deps);
  const appName = branding.appName;

  const embed: DiscordEmbed = {
    author: brandAuthor(branding),
    title: `⚡ About ${appName}`,
    description: `**${appName}** is a modern, lightweight RSS/Atom feed syndication service built specifically for Discord.`,
    color: STANDARD_EMBED_COLOR,
    fields,
    footer: { text: `${appName} • Feed Syndication` },
    timestamp: new Date().toISOString(),
  };
  if (branding.iconUrl) {
    embed.thumbnail = { url: branding.iconUrl };
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embed],
    },
  };
}
