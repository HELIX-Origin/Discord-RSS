import type { AppDeps } from '../../app.js';
import {
  InteractionResponseType,
  type ApplicationCommand,
  type DiscordInteraction,
  type InteractionResponse,
} from '../types.js';

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
      name: '📡 Core Capabilities',
      value: [
        '• **RSS & Atom Feeds** — Automatic polling, deduplication, and rich embeds with primary images',
        '• **Direct Channel Delivery** — Dispatches updates straight to designated Discord channels',
        '• **Webpage Scraper** — Automated updates for websites lacking native RSS/Atom feeds',
        '• **Responsive Web Dashboard** — Dual-tone Light and Dark themes with live logs and feed controls',
      ].join('\n'),
      inline: false,
    },
    {
      name: '⚡ Architecture',
      value: [
        '• **Runtime**: Native Node.js & TypeScript ESM (zero runtime dependencies)',
        '• **Storage**: High-speed in-memory state with SQLite write-through persistence',
        `• **Uptime**: ${uptimeStr}`,
      ].join('\n'),
      inline: false,
    },
    {
      name: '🖥️ Web Dashboard',
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

  const appName = deps.bot?.getAppName() || 'HELIX RSS';

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `⚡ About ${appName}`,
          description: `**${appName}** is a modern, lightweight RSS/Atom feed syndication service built specifically for Discord.`,
          color: 0x06b6d4,
          fields,
          footer: { text: `${appName} • Feed Syndication` },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}
