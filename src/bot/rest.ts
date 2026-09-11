import type { ApplicationCommand, InteractionResponse, InteractionResponseData } from './types.js';

export interface DiscordApplicationInfo {
  id: string;
  name: string;
  owner?: { id: string; username: string; discriminator?: string; global_name?: string | null };
  team?: {
    id: string;
    name: string;
    owner_user_id: string;
    members: Array<{
      membership_state: number;
      team_id: string;
      user: { id: string; username: string; discriminator?: string; global_name?: string | null };
      role: string;
    }>;
  };
}

function formatErrorText(status: number, text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<!DOCTYPE')) {
    if (status === 429) {
      return `HTTP 429 - Discord API rate limit / Cloudflare 1015 (temporary IP restriction)`;
    }
    return `HTTP ${status} - upstream returned HTML error page`;
  }
  return `HTTP ${status} - ${trimmed}`;
}

export class DiscordRestClient {
  private readonly baseUrl: string;

  constructor(
    private readonly token: string,
    baseUrl = 'https://discord.com/api/v10',
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bot ${this.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot (https://github.com/HELIX-Origin/HELIX-RSS, 0.1.0)',
      ...extra,
    };
  }

  async getCurrentApplication(): Promise<DiscordApplicationInfo> {
    const res = await fetch(`${this.baseUrl}/oauth2/applications/@me`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch current application info: ${formatErrorText(res.status, text)}`);
    }

    return (await res.json()) as DiscordApplicationInfo;
  }

  async registerGlobalCommands(clientId: string, commands: ApplicationCommand[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/applications/${clientId}/commands`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(commands),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to register global slash commands: ${formatErrorText(res.status, text)}`);
    }
  }

  async getBotGuilds(): Promise<Array<{ id: string; name: string; icon: string | null }>> {
    const res = await fetch(`${this.baseUrl}/users/@me/guilds`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch bot guilds: ${formatErrorText(res.status, text)}`);
    }

    return (await res.json()) as Array<{ id: string; name: string; icon: string | null }>;
  }

  async getGuildChannels(
    guildId: string,
  ): Promise<Array<{ id: string; name: string; type: number; position?: number }>> {
    const res = await fetch(`${this.baseUrl}/guilds/${guildId}/channels`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch channels for guild ${guildId}: ${formatErrorText(res.status, text)}`);
    }

    const all = (await res.json()) as Array<{ id: string; name: string; type: number; position?: number }>;
    // Filter to text and announcement channels (0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT)
    return all.filter((c) => c.type === 0 || c.type === 5);
  }

  async sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void> {
    const res = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to send Discord channel message in channel ${channelId}: ${formatErrorText(res.status, text)}`,
      );
    }
  }

  async sendInteractionResponse(
    interactionId: string,
    interactionToken: string,
    response: InteractionResponse,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/interactions/${interactionId}/${interactionToken}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://github.com/HELIX-Origin/HELIX-RSS, 0.1.0)',
      },
      body: JSON.stringify(response),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send interaction callback: ${formatErrorText(res.status, text)}`);
    }
  }

  async editOriginalInteractionResponse(
    applicationId: string,
    interactionToken: string,
    data: InteractionResponseData,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/webhooks/${applicationId}/${interactionToken}/messages/@original`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://github.com/HELIX-Origin/HELIX-RSS, 0.1.0)',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to edit original interaction response: ${formatErrorText(res.status, text)}`);
    }
  }

  async sendFollowupMessage(
    applicationId: string,
    interactionToken: string,
    data: InteractionResponseData,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/webhooks/${applicationId}/${interactionToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://github.com/HELIX-Origin/HELIX-RSS, 0.1.0)',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send interaction followup message: ${formatErrorText(res.status, text)}`);
    }
  }
}
