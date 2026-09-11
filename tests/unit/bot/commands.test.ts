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

    it('adds an RSS feed with automatic webhook creation', async () => {
      vi.spyOn(rest, 'createChannelWebhook').mockResolvedValueOnce({
        id: 'wh-99',
        name: 'RSS: Test Blog',
        type: 1,
        url: 'https://discord.com/api/webhooks/wh-99/tok-99',
      });

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
      expect(feeds.some((f) => f.name === 'Test Blog')).toBe(true);
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
  });

  describe('/webhook commands', () => {
    const guildId = 'guild-webhook-test';

    it('creates a webhook in channel', async () => {
      vi.spyOn(rest, 'createChannelWebhook').mockResolvedValueOnce({
        id: 'wh-custom',
        name: 'Custom Hook',
        type: 1,
        url: 'https://discord.com/api/webhooks/wh-custom/tok-custom',
      });

      const interaction: DiscordInteraction = {
        id: 'inter-7',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-7',
        version: 1,
        data: {
          id: 'cmd-webhook',
          name: 'webhook',
          type: 1,
          options: [
            {
              name: 'create',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [
                { name: 'name', type: ApplicationCommandOptionType.STRING, value: 'Custom Hook' },
                { name: 'channel', type: ApplicationCommandOptionType.CHANNEL, value: 'chan-custom' },
              ],
            },
          ],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Webhook Created & Registered');
    });

    it('lists registered webhooks', async () => {
      const interaction: DiscordInteraction = {
        id: 'inter-8',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-8',
        version: 1,
        data: {
          id: 'cmd-webhook',
          name: 'webhook',
          type: 1,
          options: [{ name: 'list', type: ApplicationCommandOptionType.SUB_COMMAND }],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Webhooks for this Server');
      expect(res.data?.embeds?.[0]?.fields?.[0]?.name).toContain('Custom Hook');
    });
  });

  describe('/monitor commands', () => {
    const guildId = 'guild-monitor-test';

    it('adds and checks a website monitor', async () => {
      const interactionAdd: DiscordInteraction = {
        id: 'inter-9',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-9',
        version: 1,
        data: {
          id: 'cmd-monitor',
          name: 'monitor',
          type: 1,
          options: [
            {
              name: 'add',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [
                { name: 'name', type: ApplicationCommandOptionType.STRING, value: 'My Site' },
                { name: 'url', type: ApplicationCommandOptionType.STRING, value: 'https://mysite.com' },
              ],
            },
          ],
        },
      };

      const resAdd = await dispatchInteraction(interactionAdd, ctx.deps, rest);
      expect(resAdd.data?.embeds?.[0]?.title).toContain('Monitor Added');

      vi.spyOn(ctx.deps.status, 'checkMonitor').mockImplementation(async (userId, monId) => {
        ctx.deps.repo.setMonitorChecked(userId, monId, 'online');
      });

      const interactionCheck: DiscordInteraction = {
        id: 'inter-10',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: guildId,
        token: 'tok-10',
        version: 1,
        data: {
          id: 'cmd-monitor',
          name: 'monitor',
          type: 1,
          options: [
            {
              name: 'check',
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [{ name: 'id', type: ApplicationCommandOptionType.STRING, value: 'My Site' }],
            },
          ],
        },
      };

      const resCheck = await dispatchInteraction(interactionCheck, ctx.deps, rest);
      expect(resCheck.data?.embeds?.[0]?.title).toContain('Check Result: My Site');
      expect(resCheck.data?.embeds?.[0]?.fields?.[0]?.value).toContain('Online');
    });
  });

  describe('/stats and /bind commands', () => {
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

    it('handles /bind with valid account', async () => {
      const user = ctx.deps.repo.createUser('botowner@test.com', 'hash123', 'Owner');

      const interaction: DiscordInteraction = {
        id: 'inter-12',
        application_id: 'app-1',
        type: InteractionType.APPLICATION_COMMAND,
        guild_id: 'guild-binding-test',
        token: 'tok-12',
        version: 1,
        data: {
          id: 'cmd-bind',
          name: 'bind',
          type: 1,
          options: [{ name: 'email', type: ApplicationCommandOptionType.STRING, value: user.email }],
        },
      };

      const res = await dispatchInteraction(interaction, ctx.deps, rest);
      expect(res.data?.embeds?.[0]?.title).toContain('Account Bound Successfully');
      expect(res.data?.embeds?.[0]?.description).toContain(user.email);
    });
  });
});
