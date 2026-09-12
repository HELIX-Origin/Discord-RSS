import type { AppDeps } from '../../app.js';
import type { Router } from '../http/router.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readBodyJson, sendError, sendJson } from '../http/helpers.js';
import { WebhookRouter } from '../../webhook/router.js';
import type { Feed } from '../../state/types.js';

let webhookRouter: WebhookRouter | null = null;

export function getWebhookRouter(): WebhookRouter | null {
  return webhookRouter;
}

export function initWebhookRouter(deps: AppDeps): WebhookRouter {
  webhookRouter = new WebhookRouter(deps);
  return webhookRouter;
}

export function registerWebhookRoutes(router: Router<AppDeps>): void {
  router.add(
    'GET',
    '/webhook/callback',
    async (req: IncomingMessage, res: ServerResponse, _ctx: unknown, _d: AppDeps) => {
      const routerInstance = getWebhookRouter();
      if (!routerInstance) {
        sendError(res, 503, 'Webhook router not initialized');
        return;
      }

      const handled = await routerInstance.handleVerification(req, res);
      if (!handled) {
        sendError(res, 400, 'Invalid verification request');
      }
    },
  );

  router.add(
    'POST',
    '/webhook/callback',
    async (req: IncomingMessage, res: ServerResponse, _ctx: unknown, _d: AppDeps) => {
      const routerInstance = getWebhookRouter();
      if (!routerInstance) {
        sendError(res, 503, 'Webhook router not initialized');
        return;
      }

      await routerInstance.handleNotification(req, res);
    },
  );

  router.add(
    'POST',
    '/webhook/twitch/callback',
    async (req: IncomingMessage, res: ServerResponse, _ctx: unknown, _d: AppDeps) => {
      const routerInstance = getWebhookRouter();
      if (!routerInstance) {
        sendError(res, 503, 'Webhook router not initialized');
        return;
      }

      // Twitch EventSub verification
      const _messageId = req.headers['twitch-eventsub-message-id'] as string;
      const _messageTimestamp = req.headers['twitch-eventsub-message-timestamp'] as string;
      const _messageSignature = req.headers['twitch-eventsub-message-signature'] as string;
      const messageType = req.headers['twitch-eventsub-message-type'] as string;

      const body = (await readBodyJson(req)) as { challenge?: string; event?: { type: string } };

      if (messageType === 'webhook_callback_verification') {
        // Respond with challenge
        sendJson(res, 200, { challenge: body.challenge });
        return;
      }

      if (messageType === 'notification') {
        // Handle stream online/offline events
        const event = body.event;
        if (event && (event.type === 'stream.online' || event.type === 'stream.offline')) {
          // Process through existing router
          // This would need Twitch-specific handling
        }
      }

      sendJson(res, 200, { success: true });
    },
  );

  router.add(
    'POST',
    '/webhook/youtube/callback',
    async (req: IncomingMessage, res: ServerResponse, _ctx: unknown, _d: AppDeps) => {
      const routerInstance = getWebhookRouter();
      if (!routerInstance) {
        sendError(res, 503, 'Webhook router not initialized');
        return;
      }

      await routerInstance.handleNotification(req, res);
    },
  );
}

export async function subscribeFeedToWebhook(_deps: AppDeps, feed: Feed): Promise<boolean> {
  const routerInstance = getWebhookRouter();
  if (!routerInstance) return false;

  return routerInstance.subscribeToFeed(feed);
}
