import type { ApplicationCommand, InteractionResponse, InteractionResponseData } from './types.js';

export interface DiscordApplicationInfo {
  id: string;
  name: string;
  icon?: string | null;
  description?: string;
  bot?: {
    id: string;
    username: string;
    avatar?: string | null;
    global_name?: string | null;
    discriminator?: string;
  };
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

const DISCORD_API_TIMEOUT_MS = 8000;

export type DiscordChannelSnapshot = {
  id: string;
  name: string;
  type: number;
  guild_id?: string;
  parent_id?: string | null;
  auto_archive_duration?: number;
  thread_metadata?: {
    archived: boolean;
    archive_timestamp?: string | null;
    locked?: boolean;
  } | null;
  message_count?: number;
  total_message_sent?: number;
};

export class DiscordRestClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(
    private readonly token: string,
    baseUrl = 'https://discord.com/api/v10',
    userAgent?: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    const repoUrl =
      process.env['REPO_URL']?.trim() ||
      process.env['GITHUB_REPO']?.trim() ||
      process.env['REPOSITORY_URL']?.trim() ||
      process.env['PROJECT_URL']?.trim() ||
      '';
    this.userAgent =
      userAgent ||
      process.env['USER_AGENT']?.trim() ||
      process.env['DISCORD_USER_AGENT']?.trim() ||
      (repoUrl ? `DiscordBot (${repoUrl}, 0.1.0)` : 'DiscordBot (0.1.0)');
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bot ${this.token}`,
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent,
      ...extra,
    };
  }

  async getCurrentApplication(): Promise<DiscordApplicationInfo> {
    const res = await fetch(`${this.baseUrl}/oauth2/applications/@me`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch channels for guild ${guildId}: ${formatErrorText(res.status, text)}`);
    }

    const all = (await res.json()) as Array<{ id: string; name: string; type: number; position?: number }>;
    // Filter to text and announcement channels (0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT)
    return all.filter((c) => c.type === 0 || c.type === 5);
  }

  /** Returns every channel of a guild without filtering (includes forums and categories). */
  async getGuildChannelsAll(
    guildId: string,
  ): Promise<Array<{ id: string; name: string; type: number; position?: number }>> {
    const res = await fetch(`${this.baseUrl}/guilds/${guildId}/channels`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch channels for guild ${guildId}: ${formatErrorText(res.status, text)}`);
    }

    return (await res.json()) as Array<{ id: string; name: string; type: number; position?: number }>;
  }

  /** Fetches a channel (including threads) with its metadata, archive state and message counts. */
  async getChannel(channelId: string): Promise<DiscordChannelSnapshot> {
    const res = await fetch(`${this.baseUrl}/channels/${channelId}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch channel ${channelId}: ${formatErrorText(res.status, text)}`);
    }

    return (await res.json()) as DiscordChannelSnapshot;
  }

  /**
   * Creates a thread (post) inside a forum channel. When `message` carries embeds
   * they become the very first message of the thread.
   */
  async createForumThread(
    forumChannelId: string,
    payload: {
      name: string;
      message?: { content?: string; embeds?: unknown[] } | null;
      autoArchiveDuration?: number;
    },
  ): Promise<{ id: string; name: string; type: number }> {
    const res = await fetch(`${this.baseUrl}/channels/${forumChannelId}/threads`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: payload.name.slice(0, 100),
        type: 11,
        auto_archive_duration: payload.autoArchiveDuration,
        message: payload.message ?? undefined,
      }),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to create forum thread in channel ${forumChannelId}: ${formatErrorText(res.status, text)}`,
      );
    }

    return (await res.json()) as { id: string; name: string; type: number };
  }

  /** Closes a thread: archives it and locks it so no further messages can be sent. */
  async archiveThread(threadId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/channels/${threadId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ archived: true, locked: true }),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to archive thread ${threadId}: ${formatErrorText(res.status, text)}`);
    }
  }

  async sendChannelMessage(channelId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void> {
    const res = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
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
      headers: this.headers(),
      body: JSON.stringify(response),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
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
      headers: this.headers(),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
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
      headers: this.headers(),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send interaction followup message: ${formatErrorText(res.status, text)}`);
    }
  }
}
