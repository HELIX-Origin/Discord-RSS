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

    await expect(rest.sendChannelMessage('chan-456', { content: 'Test' })).rejects.toThrow('HTTP 403');
  });
});
