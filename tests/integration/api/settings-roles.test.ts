import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Settings & User Roles API', () => {
  let ctx: BuiltAppDeps;
  let ownerClient: TestClient;
  let userClient: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const owner = ctx.deps.repo.getOrCreateOwnerUser();
    const token = 'test-owner-token';
    ctx.deps.repo.createSession(owner.id, token, new Date(Date.now() + 86400000).toISOString());
    const server = await startAppServer(ctx.deps);
    ownerClient = new TestClient(server.url);
    ownerClient.setSessionToken(token);
    userClient = new TestClient(server.url);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('allows App Team / Owner to list users while members are forbidden', async () => {
    const regRes = await userClient.post('/api/auth/register', {
      email: 'member@example.com',
      password: 'password123',
    });
    expect(regRes.status).toBe(201);
    const memberId = (regRes.body as { user: { id: number; role: string } }).user.id;
    expect(memberId).toBeGreaterThan(1);

    const listRes = await ownerClient.get<Array<{ id: number; email: string; role: string }>>('/api/settings/users');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const foundMember = listRes.body.find((u) => u.id === memberId);
    expect(foundMember).toBeDefined();
    expect(foundMember?.role).toBe('member');

    const userSettingsRes = await userClient.get('/api/settings');
    expect(userSettingsRes.status).toBe(403);

    const userUsersRes = await userClient.get('/api/settings/users');
    expect(userUsersRes.status).toBe(403);
  });

  it('rejects manual role modification since roles are managed via Discord Developer Portal', async () => {
    const regRes = await userClient.post('/api/auth/register', {
      email: 'tester@example.com',
      password: 'password123',
    });
    const targetId = (regRes.body as { user: { id: number } }).user.id;

    const res = await ownerClient.patch(`/api/settings/users/${targetId}/role`, {
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain(
      'Manual role assignment is not supported. Application team permissions are managed directly in the Discord Developer Portal.',
    );
  });
});
