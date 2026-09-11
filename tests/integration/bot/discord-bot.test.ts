import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAppDeps, type BuiltAppDeps } from '../../helpers/app-deps.js';
import { DiscordBot } from '../../../src/bot/bot.js';
import { ApplicationCommandOptionType, InteractionType, type DiscordInteraction } from '../../../src/bot/types.js';
import { startRssServer, startWebhookServer } from '../../mocks/rss-server.js';

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Integration Feed</title>
    <link>http://bot.example</link>
    <item>
      <title>Bot Entry 1</title>
      <link>http://bot.example/entry-1</link>
      <guid>bot-entry-1</guid>
      <description>Delivered via bot configured feed.</description>
    </item>
  </channel>
</rss>`;

describe('DiscordBot Integration', () => {
  let ctx: BuiltAppDeps;
  let bot: DiscordBot;
  let rss: Awaited<ReturnType<typeof startRssServer>>;
  let webhook: Awaited<ReturnType<typeof startWebhookServer>>;

  beforeAll(async () => {
    [rss, webhook] = await Promise.all([startRssServer(SAMPLE_RSS), startWebhookServer()]);
    ctx = await buildAppDeps({
      config: {
        botToken: 'mock-bot-token',
        clientId: 'mock-client-id',
        redirectUrl: 'https://myservice.com/invite',
      },
    });

    bot = new DiscordBot(ctx.deps, {
      token: 'mock-bot-token',
      clientId: 'mock-client-id',
      redirectUrl: 'https://myservice.com/invite',
    });
  });

  afterAll(async () => {
    bot.stop();
    rss.close();
    webhook.close();
    await ctx.cleanup();
  });

  it('completes full bot flow: slash command -> channel setup -> feed add -> poll -> direct channel delivery', async () => {
    ctx.deps.feeds.setBot(bot);
    const channelMessageSpy = vi.spyOn(bot.rest, 'sendChannelMessage').mockResolvedValue(undefined);
    const responseSpy = vi.spyOn(bot.rest, 'sendInteractionResponse').mockResolvedValue(undefined);

    // 2. Simulate Discord Gateway sending an INTERACTION_CREATE for `/feed add`
    const addInteraction: DiscordInteraction = {
      id: 'inter-add-1',
      application_id: 'mock-client-id',
      type: InteractionType.APPLICATION_COMMAND,
      guild_id: 'guild-integration-1',
      channel_id: 'chan-integration-1',
      token: 'tok-add-1',
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
              { name: 'name', type: ApplicationCommandOptionType.STRING, value: 'Bot Feed' },
              { name: 'url', type: ApplicationCommandOptionType.STRING, value: rss.url },
              { name: 'channel', type: ApplicationCommandOptionType.CHANNEL, value: 'chan-integration-1' },
            ],
          },
        ],
      },
    };

    // Private method invocation via test harness
    await (bot as unknown as { handleInteraction: (i: DiscordInteraction) => Promise<void> }).handleInteraction(
      addInteraction,
    );

    expect(responseSpy).toHaveBeenCalled();

    // Verify feed is now in AppState / DB
    const user = ctx.deps.repo.getOrCreateGuildUser('guild-integration-1');
    const feeds = ctx.deps.repo.listFeeds(user.id);
    const createdFeed = feeds.find((f) => f.name === 'Bot Feed');
    expect(createdFeed).toBeDefined();
    expect(createdFeed?.channelId).toBe('chan-integration-1');

    // 3. Simulate Discord Gateway sending an INTERACTION_CREATE for `/feed poll`
    const pollInteraction: DiscordInteraction = {
      id: 'inter-poll-1',
      application_id: 'mock-client-id',
      type: InteractionType.APPLICATION_COMMAND,
      guild_id: 'guild-integration-1',
      token: 'tok-poll-1',
      version: 1,
      data: {
        id: 'cmd-feed',
        name: 'feed',
        type: 1,
        options: [
          {
            name: 'poll',
            type: ApplicationCommandOptionType.SUB_COMMAND,
            options: [{ name: 'id', type: ApplicationCommandOptionType.STRING, value: 'Bot Feed' }],
          },
        ],
      },
    };

    await (bot as unknown as { handleInteraction: (i: DiscordInteraction) => Promise<void> }).handleInteraction(
      pollInteraction,
    );

    // 4. Verify bot delivered the embed message directly to the Discord channel
    expect(channelMessageSpy).toHaveBeenCalledWith(
      'chan-integration-1',
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            title: 'Bot Entry 1',
            url: expect.stringContaining('/entry-1'),
          }),
        ]),
      }),
    );
  });

  it('serves health status and handles interactions via HTTP endpoint', async () => {
    const httpBot = new DiscordBot(ctx.deps, {
      token: 'mock-token',
      clientId: 'mock-client',
      redirectUrl: null,
      port: 0, // ephemeral port for test
      host: '127.0.0.1',
    });

    vi.spyOn(httpBot.rest, 'getCurrentApplication').mockResolvedValue({ id: 'mock-client', name: 'TestBot' });
    vi.spyOn(httpBot.rest, 'registerGlobalCommands').mockResolvedValue(0);
    vi.spyOn(httpBot['gateway'], 'connect').mockImplementation(() => {});

    await httpBot.start();

    // Get assigned address of http server
    const server = (httpBot as unknown as { server: import('node:http').Server }).server;
    const addr = server.address() as import('node:net').AddressInfo;

    const requestBot = (
      path: string,
      options?: { method?: string; body?: unknown; headers?: Record<string, string> },
    ) => {
      return new Promise<{ status: number; body: unknown; raw: string }>((resolve, reject) => {
        const payload = options?.body !== undefined ? JSON.stringify(options.body) : undefined;
        const reqHeaders: Record<string, string> = { ...(options?.headers ?? {}) };
        if (payload) {
          reqHeaders['content-type'] = 'application/json';
          reqHeaders['content-length'] = String(Buffer.byteLength(payload));
        }
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: addr.port,
            path,
            method: options?.method ?? 'GET',
            headers: reqHeaders,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              let parsed: unknown = data;
              try {
                parsed = JSON.parse(data);
              } catch {
                /* raw */
              }
              resolve({ status: res.statusCode ?? 0, body: parsed, raw: data });
            });
          },
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
      });
    };

    // Test GET /health
    const healthRes = await requestBot('/health');
    expect(healthRes.status).toBe(200);
    expect((healthRes.body as { status: string; service: string }).status).toBe('ok');
    expect((healthRes.body as { status: string; service: string }).service).toBe('helix-rss-bot');

    // Test GET /api/auth/callback/discord with code -> redirects to main app
    const callbackRedirectRes = await requestBot('/api/auth/callback/discord?code=mock-code&state=mock-state');
    expect(callbackRedirectRes.status).toBe(302);

    // Test GET /api/auth/callback/discord without code -> renders 200 completion page
    const callbackRes = await requestBot('/api/auth/callback/discord');
    expect(callbackRes.status).toBe(200);
    expect(callbackRes.raw).toContain('Discord Authorization Completed');

    // Test POST /interactions with PING
    const pingRes = await requestBot('/interactions', { method: 'POST', body: { type: 1 } });
    expect(pingRes.status).toBe(200);
    expect((pingRes.body as { type: number }).type).toBe(1);

    httpBot.stop();
  });
});
