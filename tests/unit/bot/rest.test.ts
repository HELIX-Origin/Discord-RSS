import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DiscordRestClient } from '../../../src/bot/rest.js';
import { InteractionResponseType } from '../../../src/bot/types.js';

describe('DiscordRestClient', () => {
  let rest: DiscordRestClient;

  beforeEach(() => {
    rest = new DiscordRestClient('mock-bot-token');
    vi.restoreAllMocks();
  });

  it('registers global slash commands', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    await rest.registerGlobalCommands('app-123', [{ name: 'feed', description: 'Feed commands' }]);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://discord.com/api/v10/applications/app-123/commands',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bot mock-bot-token',
        }),
      }),
    );
  });

  it('creates channel webhooks', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'wh-123',
          name: 'RSS Webhook',
          token: 'tok-abc',
        }),
        { status: 200 },
      ),
    );

    const payload = await rest.createChannelWebhook('chan-456', 'RSS Webhook');
    expect(payload.id).toBe('wh-123');
    expect(payload.url).toBe('https://discord.com/api/webhooks/wh-123/tok-abc');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://discord.com/api/v10/channels/chan-456/webhooks',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('sends interaction callback responses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 204 }));

    await rest.sendInteractionResponse('inter-1', 'tok-1', {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Hello from bot' },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://discord.com/api/v10/interactions/inter-1/tok-1/callback',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('throws helpful error on failed requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Missing Permissions', { status: 403 }));

    await expect(rest.createChannelWebhook('chan-456', 'Test')).rejects.toThrow('HTTP 403');
  });
});
