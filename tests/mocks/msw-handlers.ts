import { http, type HttpResponseResolver } from 'msw';

export function cloudflareTokenHandler(response: HttpResponseResolver) {
  return http.post('https://api.cloudflare.com/client/v4/user/tokens/verify', response);
}

export function cloudflareBrowserRenderHandler(response: HttpResponseResolver) {
  return http.post('https://api.cloudflare.com/client/v4/accounts/:accountId/browser-rendering/content', response);
}
