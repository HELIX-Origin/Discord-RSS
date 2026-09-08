import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const defaultHandlers = [
  http.post(/https:\/\/discord\.com\/api\/webhooks\/.+/, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const mswServer = setupServer(...defaultHandlers);

export function startMsw(): void {
  mswServer.listen({ onUnhandledRequest: 'bypass' });
}

export function stopMsw(): void {
  mswServer.close();
}
