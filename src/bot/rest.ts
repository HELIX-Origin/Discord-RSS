import type {
  ApplicationCommand,
  DiscordWebhookPayload,
  InteractionResponse,
  InteractionResponseData,
} from './types.js';

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

export class DiscordRestClient {
  private readonly baseUrl = 'https://discord.com/api/v10';

  constructor(private readonly token: string) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bot ${this.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'HelixRSSBot/0.1 (+https://github.com/HELIX-Origin/HELIX-RSS)',
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
      throw new Error(`Failed to fetch current application info: HTTP ${res.status} - ${text}`);
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
      throw new Error(`Failed to register global slash commands: HTTP ${res.status} - ${text}`);
    }
  }

  async getBotGuilds(): Promise<Array<{ id: string; name: string; icon: string | null }>> {
    const res = await fetch(`${this.baseUrl}/users/@me/guilds`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch bot guilds: HTTP ${res.status} - ${text}`);
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
      throw new Error(`Failed to fetch channels for guild ${guildId}: HTTP ${res.status} - ${text}`);
    }

    const all = (await res.json()) as Array<{ id: string; name: string; type: number; position?: number }>;
    // Filter to text and announcement channels (0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT)
    return all.filter((c) => c.type === 0 || c.type === 5);
  }

  async createChannelWebhook(channelId: string, name: string, reason?: string): Promise<DiscordWebhookPayload> {
    const headers = this.headers(reason ? { 'X-Audit-Log-Reason': reason } : {});
    const res = await fetch(`${this.baseUrl}/channels/${channelId}/webhooks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create Discord webhook in channel ${channelId}: HTTP ${res.status} - ${text}`);
    }

    const json = (await res.json()) as DiscordWebhookPayload;
    // Construct the public execution URL if not directly returned with token
    if (!json.url && json.token) {
      json.url = `https://discord.com/api/webhooks/${json.id}/${json.token}`;
    }
    return json;
  }

  async sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void> {
    const res = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send Discord channel message in channel ${channelId}: HTTP ${res.status} - ${text}`);
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
      },
      body: JSON.stringify(response),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send interaction callback: HTTP ${res.status} - ${text}`);
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
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to edit original interaction response: HTTP ${res.status} - ${text}`);
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
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send interaction followup message: HTTP ${res.status} - ${text}`);
    }
  }
}
