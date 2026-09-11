import { GatewayOpcode, type DiscordInteraction } from './types.js';
import type { Logger } from '../util/logger.js';

export interface GatewayClientOptions {
  token: string;
  logger: Logger;
  onInteraction: (interaction: DiscordInteraction) => Promise<void>;
}

export class DiscordGatewayClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastSequence: number | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;
  private isAlive = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private readonly gatewayUrl = 'wss://gateway.discord.gg/?v=10&encoding=json';

  constructor(private readonly options: GatewayClientOptions) {}

  connect(): void {
    this.shouldReconnect = true;
    const url = this.resumeGatewayUrl ? `${this.resumeGatewayUrl}/?v=10&encoding=json` : this.gatewayUrl;

    try {
      this.options.logger.debug('Connecting to Discord Gateway', { url });
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.options.logger.info('Connected to Discord Gateway WebSocket');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.options.logger.warn('Discord Gateway connection closed', {
          code: event.code,
          reason: event.reason,
        });
        this.cleanup();
        if (this.shouldReconnect && event.code !== 4004) {
          // 4004 = Authentication failed (invalid token)
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.options.logger.error('Discord Gateway WebSocket error', { err: String(err) });
      };
    } catch (err) {
      this.options.logger.error('Failed to create Discord Gateway WebSocket', {
        err: (err as Error).message,
      });
      this.scheduleReconnect();
    }
  }

  private handleMessage(rawData: unknown): void {
    try {
      const dataStr = typeof rawData === 'string' ? rawData : String(rawData);
      const payload = JSON.parse(dataStr) as {
        op: number;
        d: unknown;
        s: number | null;
        t: string | null;
      };

      if (payload.s !== null) {
        this.lastSequence = payload.s;
      }

      switch (payload.op) {
        case GatewayOpcode.HELLO: {
          const hello = payload.d as { heartbeat_interval: number };
          this.startHeartbeat(hello.heartbeat_interval);
          this.identifyOrResume();
          break;
        }

        case GatewayOpcode.HEARTBEAT_ACK:
          this.isAlive = true;
          this.options.logger.debug('Received Discord Gateway Heartbeat ACK');
          break;

        case GatewayOpcode.HEARTBEAT:
          this.sendHeartbeat();
          break;

        case GatewayOpcode.RECONNECT:
          this.options.logger.info('Discord Gateway requested reconnect');
          this.reconnect();
          break;

        case GatewayOpcode.INVALID_SESSION: {
          const resumable = Boolean(payload.d);
          this.options.logger.warn('Discord Gateway invalid session', { resumable });
          if (!resumable) {
            this.sessionId = null;
            this.lastSequence = null;
          }
          setTimeout(() => this.identifyOrResume(), 2000);
          break;
        }

        case GatewayOpcode.DISPATCH:
          this.handleDispatch(payload.t, payload.d);
          break;

        default:
          break;
      }
    } catch (err) {
      this.options.logger.error('Error handling Discord Gateway message', {
        err: (err as Error).message,
      });
    }
  }

  private handleDispatch(event: string | null, data: unknown): void {
    if (event === 'READY') {
      const readyData = data as {
        session_id: string;
        resume_gateway_url?: string;
        user: { username: string; id: string };
      };
      this.sessionId = readyData.session_id;
      if (readyData.resume_gateway_url) {
        this.resumeGatewayUrl = readyData.resume_gateway_url;
      }
      this.options.logger.info('Discord Bot Gateway READY', {
        botUser: `${readyData.user.username} (${readyData.user.id})`,
        sessionId: this.sessionId,
      });
    } else if (event === 'RESUMED') {
      this.options.logger.info('Discord Gateway session successfully resumed');
    } else if (event === 'INTERACTION_CREATE') {
      const interaction = data as DiscordInteraction;
      this.options.onInteraction(interaction).catch((err) => {
        this.options.logger.error('Error processing interaction', {
          err: (err as Error).message,
        });
      });
    }
  }

  private startHeartbeat(intervalMs: number): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.isAlive = true;

    // First heartbeat should be jittered: interval * Math.random()
    const firstJitter = Math.floor(intervalMs * Math.random());
    setTimeout(() => {
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (!this.isAlive) {
          this.options.logger.warn('Heartbeat ACK not received; reconnecting');
          this.reconnect();
          return;
        }
        this.isAlive = false;
        this.sendHeartbeat();
      }, intervalMs);
    }, firstJitter);
  }

  private sendHeartbeat(): void {
    this.sendJson({
      op: GatewayOpcode.HEARTBEAT,
      d: this.lastSequence,
    });
  }

  private identifyOrResume(): void {
    if (this.sessionId && this.lastSequence !== null) {
      this.options.logger.debug('Attempting to resume Discord Gateway session');
      this.sendJson({
        op: GatewayOpcode.RESUME,
        d: {
          token: this.options.token,
          session_id: this.sessionId,
          seq: this.lastSequence,
        },
      });
    } else {
      this.options.logger.debug('Sending Identify to Discord Gateway');
      this.sendJson({
        op: GatewayOpcode.IDENTIFY,
        d: {
          token: this.options.token,
          intents: 1, // GUILDS intent
          properties: {
            os: process.platform,
            browser: 'HELIXRSS',
            device: 'HELIXRSS',
          },
        },
      });
    }
  }

  private sendJson(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private reconnect(): void {
    if (this.ws) {
      try {
        this.ws.close(4000, 'Reconnecting');
      } catch {
        /* ignore */
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.options.logger.info(`Reconnecting to Discord Gateway in ${delay / 1000}s...`);
    setTimeout(() => {
      if (this.shouldReconnect) this.connect();
    }, delay);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  stop(): void {
    this.shouldReconnect = false;
    this.cleanup();
    if (this.ws) {
      try {
        this.ws.close(1000, 'Bot stopping');
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    this.options.logger.info('Discord Gateway client stopped');
  }
}
