import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAppDeps, type BuiltAppDeps } from '../../helpers/app-deps.js';
import { DiscordRestClient } from '../../../src/bot/rest.js';
import { dispatchInteraction } from '../../../src/bot/commands/index.js';
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  InteractionType,
  type DiscordInteraction,
} from '../../../src/bot/types.js';

describe('Discord Bot Slash Commands', () => {
  let ctx: BuiltAppDeps;
  let rest: DiscordRestClient;

  beforeAll(async () => {
    ctx = await buildAppDeps({
      config: {
        clientId: 'test-app-id',
        redirectUrl: 'https://test.com/oauth',
      },
    });
    rest = new DiscordRestClient('mock-token');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('rejects commands when used outside a guild', async () => {
    const interaction: DiscordInteraction = {
      id: 'inter-1',
      application_id: 'app-1',
      type: InteractionType.APPLICATION_COMMAND,
      token: 'tok-1',
      version: 1,
      data: {
        id: 'cmd-1',
        name: 'feed',
        type: 1,
        options: [{ name: 'list', type: ApplicationCommandOptionType.SUB_COMMAND }],
      },
    };

    const res = await dispatchInteraction(interaction, ctx.deps, rest);
    expect(res.data?.content).toContain('only be used inside a Discord server');
  });

  describe('/feed commands', () => {
    const guildId = 'guild-test-123';

    it('adds an RSS feed with direct channel destination', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-2',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-2',
        version: 1,
        data: {
          id: 'cmd-feed',
          name: 'feed',
          type: 1,
          options: [
            {
              name: 'add',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [
                { name: 'name', type: ApplicationCommandOptionType.STRING, value: 'Test Blog' },
                { name: 'url', type: ApplicationCommandOptionType.STRING, value: 'https://test.com/rss.xml' },
                { name: 'channel', type: ApplicationCommandOptionType.CHANNEL, value: 'chan-123' },
              ],
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
      expect(res.data?.embeds?.[0]?.title).toContain('Feed Added Successfully');

      const user = ctx.deps.repo.getOrCreateGuildUser(guildId);
      const feeds = ctx.deps.repo.listFeeds(user.id);
      expect(feeds.some((f) => f.name === 'Test Blog' && f.channelId === 'chan-123')).toBe(true);
    });

    it('lists feeds for the guild', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-3',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-3',
        version: 1,
        data: {
          id: 'cmd-feed',
          name: 'feed',
          type: 1,
          options: [{ name: 'list', type: ApplicationCommandOptionType.SUB_COMMAND }],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Feeds for this Server');
      expect(res.data?.embeds?.[0]?.fields?.[0]?.name).toContain('Test Blog');
    });

    it('toggles feed polling', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-4',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-4',
        version: 1,
        data: {
          id: 'cmd-feed',
          name: 'feed',
          type: 1,
          options: [
            {
              name: 'toggle',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [
                { name: 'id', type: ApplicationCommandOptionType.STRING, value: 'Test Blog' },
                { name: 'enabled', type: ApplicationCommandOptionType.BOOLEAN, value: false },
              ],
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Feed Paused');

      const user = ctx.deps.repo.getOrCreateGuildUser(guildId);
      const feed = ctx.deps.repo.listFeeds(user.id).find((f) => f.name === 'Test Blog');
      expect(feed?.enabled).toBe(0);
    });

    it('polls feed manually', async () => {
      vi.spyOn(ctx.deps.feeds, 'pollFeed').mockResolvedValue(undefined);

      const interaction: DiscordInteraction = {
        id: 'inter-5',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-5',
        version: 1,
        data: {
          id: 'cmd-feed',
          name: 'feed',
          type: 1,
          options: [
            {
              name: 'poll',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [{ name: 'id', type: ApplicationCommandOptionType.STRING, value: 'Test Blog' }],
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Polled Feed: Test Blog');
      expect(res.data?.embeds?.[0]?.fields?.[0]?.name).toBe('Feed URL');
    });

    it('removes feed', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-6',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-6',
        version: 1,
        data: {
          id: 'cmd-feed',
          name: 'feed',
          type: 1,
          options: [
            {
              name: 'remove',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [{ name: 'id', type: ApplicationCommandOptionType.STRING, value: 'Test Blog' }],
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Feed Deleted');
    });

    it('defaults to interaction channel when channel option is omitted', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-7',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        channel_id: 'chan-current',
        token: 'tok-7',
        version: 1,
        data: {
          id: 'cmd-feed-default',
          name: 'feed',
          type: 1,
          options: [
            {
              name: 'add',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [
                { name: 'name', type: ApplicationCommandOptionType.STRING, value: 'Default Channel Feed' },
                { name: 'url', type: ApplicationCommandOptionType.STRING, value: 'https://test.com/default.xml' },
              ],
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Feed Added Successfully');
      const user = ctx.deps.repo.getOrCreateGuildUser(guildId);
      const feed = ctx.deps.repo.listFeeds(user.id).find((f) => f.name === 'Default Channel Feed');
      expect(feed?.channelId).toBe('chan-current');
    });
  });

  describe('/stats command', () => {
    it('returns service stats and bot invite link', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-11',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        token: 'tok-11',
        version: 1,
        data: { id: 'cmd-stats', name: 'stats', type: 1 },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('HELIX RSS Service Status');
      expect(res.data?.embeds?.[0]?.fields?.some((f) => f.name === '🤖 Bot Invite')).toBe(true);
    });
  });

  describe('/about command', () => {
    it('returns rich embed with architecture, capabilities, and dashboard link', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-about',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        token: 'tok-about',
        version: 1,
        data: { id: 'cmd-about', name: 'about', type: 1 },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
      const embed = res.data?.embeds?.[0];
      expect(embed).toBeDefined();
      expect(embed?.title).toBe('⚡ About HELIX RSS');
      expect(embed?.description).toContain('self-hosted RSS/Atom feed syndication');
      expect(embed?.fields?.some((f) => f.name === '📡 Core Capabilities')).toBe(true);
      expect(embed?.fields?.some((f) => f.name === '⚡ Architecture')).toBe(true);
      expect(embed?.fields?.some((f) => f.name === '🖥️ Web Dashboard')).toBe(true);
      expect(embed?.fields?.some((f) => f.name === '🤖 Bot Invite')).toBe(true);
    });
  });

  describe('/help command', () => {
    it('dynamically lists all registered commands without hardcoding', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-help-all',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        token: 'tok-help-1',
        version: 1,
        data: { id: 'cmd-help', name: 'help', type: 1 },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
      const embed = res.data?.embeds?.[0];
      expect(embed).toBeDefined();
      expect(embed?.title).toBe('📖 HELIX RSS Slash Commands');
      expect(embed?.fields).toBeDefined();

      const fieldNames = embed?.fields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('/feed');
      expect(fieldNames).not.toContain('/monitor');
      expect(fieldNames).toContain('/stats');
      expect(fieldNames).toContain('/about');
      expect(fieldNames).toContain('/help');

      // Verify subcommands are dynamically listed
      const feedField = embed?.fields?.find((f) => f.name === '/feed');
      expect(feedField?.value).toContain('/feed add');
      expect(feedField?.value).toContain('/feed list');
    });

    it('provides detailed help for a specific command option', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-help-feed',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        token: 'tok-help-2',
        version: 1,
        data: {
          id: 'cmd-help',
          name: 'help',
          type: 1,
          options: [
            {
              name: 'command',
              type: ApplicationCommandOptionType.STRING,
              value: 'feed',
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
      const embed = res.data?.embeds?.[0];
      expect(embed?.title).toBe('📖 Command: /feed');
      expect(embed?.description).toContain('Manage RSS/Atom and scrape feeds');
      expect(embed?.fields?.some((f) => f.name === '/feed add')).toBe(true);
    });

    it('returns an error embed when command query does not exist', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-help-unknown',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        token: 'tok-help-3',
        version: 1,
        data: {
          id: 'cmd-help',
          name: 'help',
          type: 1,
          options: [
            {
              name: 'command',
              type: ApplicationCommandOptionType.STRING,
              value: 'nonexistent',
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
      const embed = res.data?.embeds?.[0];
      expect(embed?.title).toBe('❓ Command Not Found');
      expect(embed?.description).toContain('nonexistent');
      expect(embed?.description).toContain('Available commands');
    });
  });
});
