import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const defaultHandlers = [
  http.post('https://discord.com/api/v10/oauth2/token', () => {
    return HttpResponse.json({
      access_token: 'mock-discord-access-token',
      token_type: 'Bearer',
      expires_in: 604800,
      refresh_token: 'mock-discord-refresh-token',
      scope: 'identify email',
    });
  }),
  http.get('https://discord.com/api/v10/users/@me', () => {
    return HttpResponse.json({
      id: '123456789012345678',
      username: 'testdiscorduser',
      discriminator: '0',
      global_name: 'Discord Tester',
      avatar: null,
      email: 'discorduser@example.com',
      verified: true,
    });
  }),
  http.get('https://discord.com/api/v10/oauth2/applications/@me', () => {
    return HttpResponse.json({
      id: '999888777666555444',
      name: 'Helix RSS Bot',
      owner: {
        id: '123456789012345678',
        username: 'testdiscorduser',
      },
    });
  }),
  http.get('https://discord.com/api/v10/users/@me/guilds', () => {
    return HttpResponse.json([
      {
        id: '111222333444555666',
        name: 'Test Server',
        icon: null,
        owner: true,
        permissions: '2147483647',
      },
    ]);
  }),
];

export const mswServer = setupServer(...defaultHandlers);

export function startMsw(): void {
  mswServer.listen({ onUnhandledRequest: 'bypass' });
}

export function stopMsw(): void {
  mswServer.close();
}
