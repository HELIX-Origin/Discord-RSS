import { http, HttpResponse } from 'msw';

export function discordWebhookHandler(response: () => Response | HttpResponse) {
  return http.post(/https:\/\/discord\.com\/api\/webhooks\/.+/, response);
}

export function cloudflareTokenHandler(response: () => Response | HttpResponse) {
  return http.post('https://api.cloudflare.com/client/v4/user/tokens/verify', response);
}

export function cloudflareBrowserRenderHandler(response: () => Response | HttpResponse) {
  return http.post('https://api.cloudflare.com/client/v4/accounts/:accountId/browser-rendering/content', response);
}
