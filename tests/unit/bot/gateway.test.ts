import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DiscordGatewayClient } from '../../../src/bot/gateway.js';
import { createLogger } from '../../../src/util/logger.js';
import { GatewayOpcode, InteractionType, type DiscordInteraction } from '../../../src/bot/types.js';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  url: string;
  readyState = 1; // OPEN
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 1);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }

  emitMessage(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}

describe('DiscordGatewayClient', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  it('connects, handles HELLO and sends IDENTIFY', async () => {
    const onInteraction = vi.fn().mockResolvedValue(undefined);
    const client = new DiscordGatewayClient({
      token: 'test-token',
      logger: createLogger('test', 'error'),
      onInteraction,
    });

    client.connect();
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0]!;

    // Gateway sends HELLO
    ws.emitMessage({
      op: GatewayOpcode.HELLO,
      d: { heartbeat_interval: 41250 },
      s: null,
      t: null,
    });

    // Client should send IDENTIFY
    const identifyMsg = ws.sent.find((s) => {
      const p = JSON.parse(s);
      return p.op === GatewayOpcode.IDENTIFY;
    });

    expect(identifyMsg).toBeDefined();
    const identifyPayload = JSON.parse(identifyMsg!);
    expect(identifyPayload.d.token).toBe('test-token');
    expect(identifyPayload.d.intents).toBe(1);

    client.stop();
  });

  it('dispatches INTERACTION_CREATE events to callback', async () => {
    const onInteraction = vi.fn().mockResolvedValue(undefined);
    const client = new DiscordGatewayClient({
      token: 'test-token',
      logger: createLogger('test', 'error'),
      onInteraction,
    });

    client.connect();
    const ws = MockWebSocket.instances[0]!;

    const interactionPayload: DiscordInteraction = {
      id: 'inter-123',
      application_id: 'app-1',
      type: InteractionType.APPLICATION_COMMAND,
      token: 'tok-abc',
      version: 1,
      data: { id: 'c1', name: 'feed', type: 1 },
    };

    // Gateway dispatches INTERACTION_CREATE
    ws.emitMessage({
      op: GatewayOpcode.DISPATCH,
      t: 'INTERACTION_CREATE',
      s: 1,
      d: interactionPayload,
    });

    expect(onInteraction).toHaveBeenCalledWith(interactionPayload);

    client.stop();
  });
});
