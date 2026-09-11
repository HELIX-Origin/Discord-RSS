import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps, AppDeps } from '../../helpers/app-deps.js';

describe('Feeds API', () => {
  let ctx: BuiltAppDeps;
  let client: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('creates and lists feeds', async () => {
    const feed = await client.post('/api/feeds', {
      name: 'My Feed',
      url: 'https://example.com/feed.xml',
      channelId: '123456789012345678',
      feedType: 'rss',
    });
    expect(feed.status).toBe(201);
    expect((feed.body as { channelId: string }).channelId).toBe('123456789012345678');

    const list = await client.get('/api/feeds');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((list.body as Array<{ name: string }>).length).toBe(1);
  });

  it('rejects feed creation without name or url', async () => {
    const res = await client.post('/api/feeds', {
      name: '',
      url: 'https://example.com/feed.xml',
      channelId: '123456789012345678',
      feedType: 'rss',
    });
    expect(res.status).toBe(400);
  });

  it('rejects feed creation with invalid URL', async () => {
    const res = await client.post('/api/feeds', {
      name: 'Bad Feed',
      url: 'not-a-url',
      channelId: '123456789012345678',
      feedType: 'rss',
    });
    expect(res.status).toBe(400);
  });

  it('manages per-user feed posting intervals', async () => {
    // Default interval is 1 hour (3600000 ms)
    const initial = await client.get<{ pollIntervalMs: number }>('/api/feeds/interval');
    expect(initial.status).toBe(200);
    expect(initial.body.pollIntervalMs).toBe(3_600_000);

    // Update to 10 minutes (600000 ms)
    const update = await client.post<{ ok: boolean; pollIntervalMs: number }>('/api/feeds/interval', {
      pollIntervalMs: 600_000,
    });
    expect(update.status).toBe(200);
    expect(update.body.pollIntervalMs).toBe(600_000);

    // Verify it persists
    const verified = await client.get<{ pollIntervalMs: number }>('/api/feeds/interval');
    expect(verified.status).toBe(200);
    expect(verified.body.pollIntervalMs).toBe(600_000);

    // Reject non-allowed interval
    const invalid = await client.post('/api/feeds/interval', {
      pollIntervalMs: 12_345,
    });
    expect(invalid.status).toBe(400);
  });

  it('enforces server manage channels permissions when adding feeds to a server', async () => {
    // Register a second non-admin user
    const memberClient = new TestClient(client['baseUrl']);
    const regRes = await memberClient.post('/api/auth/register', {
      email: 'member2@example.com',
      password: 'password123',
    });
    expect(regRes.status).toBe(201);
    const memberId = (regRes.body as { user: { id: number } }).user.id;

    // Member with no managed guilds cannot access dashboard feeds
    const deniedFeed = await memberClient.post('/api/feeds', {
      name: 'Member Feed',
      url: 'https://example.com/rss.xml',
      channelId: 'channel-1',
    });
    expect(deniedFeed.status).toBe(403);

    // Grant user manage channels permission for guild-1
    ctx.deps.repo.setUserSetting(memberId, 'managed_guild_ids', JSON.stringify(['guild-1']));

    // Mock bot with guild-1 and guild-2
    const mockBot = {
      getGuildsWithChannels: async () => [
        {
          id: 'guild-1',
          name: 'Managed Server',
          icon: null,
          channels: [{ id: 'channel-1', name: 'general', type: 0 }],
        },
        {
          id: 'guild-2',
          name: 'Unmanaged Server',
          icon: null,
          channels: [{ id: 'channel-2', name: 'news', type: 0 }],
        },
      ],
    };
    ctx.deps.bot = mockBot as unknown as AppDeps['bot'];

    // Adding feed to channel in unmanaged server is rejected with 403
    const forbiddenRes = await memberClient.post('/api/feeds', {
      name: 'Forbidden Feed',
      url: 'https://example.com/unmanaged.xml',
      channelId: 'channel-2',
    });
    expect(forbiddenRes.status).toBe(403);
    expect((forbiddenRes.body as { error: string }).error).toContain('Manage Channels permission');

    // Adding feed to channel in managed server succeeds with 201
    const allowedRes = await memberClient.post('/api/feeds', {
      name: 'Allowed Feed',
      url: 'https://example.com/managed.xml',
      channelId: 'channel-1',
    });
    expect(allowedRes.status).toBe(201);
  });
});
