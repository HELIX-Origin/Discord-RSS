import { http, HttpResponse } from 'msw';

// Default handlers can be overridden per-test via server.use().
export const handlers = [
  http.post('https://discord.com/api/webhooks/123/token', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
