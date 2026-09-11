import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Settings & User Roles API', () => {
  let ctx: BuiltAppDeps;
  let ownerClient: TestClient;
  let userClient: TestClient;
  let adminClient: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const owner = ctx.deps.repo.getOrCreateOwnerUser();
    const token = 'test-owner-token';
    ctx.deps.repo.createSession(owner.id, token, new Date(Date.now() + 86400000).toISOString());
    const server = await startAppServer(ctx.deps);
    ownerClient = new TestClient(server.url);
    ownerClient.setSessionToken(token);
    userClient = new TestClient(server.url);
    adminClient = new TestClient(server.url);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('allows Owner to list users and promote a member to admin', async () => {
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

    const promoteRes = await ownerClient.patch(`/api/settings/users/${memberId}/role`, {
      role: 'admin',
    });
    expect(promoteRes.status).toBe(200);
    expect((promoteRes.body as { ok: boolean; role: string }).role).toBe('admin');

    const adminSettingsRes = await userClient.get('/api/settings');
    expect(adminSettingsRes.status).toBe(200);

    const adminUsersRes = await userClient.get('/api/settings/users');
    expect(adminUsersRes.status).toBe(200);

    const adminPromoteRes = await userClient.patch(`/api/settings/users/${memberId}/role`, {
      role: 'member',
    });
    expect(adminPromoteRes.status).toBe(403);
  });

  it('rejects modifying the Owner role', async () => {
    const res = await ownerClient.patch('/api/settings/users/1/role', {
      role: 'member',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('Cannot change the role of the Owner account');
  });

  it('rejects invalid role names', async () => {
    const regRes = await userClient.post('/api/auth/register', {
      email: 'tester@example.com',
      password: 'password123',
    });
    const targetId = (regRes.body as { user: { id: number } }).user.id;

    const res = await ownerClient.patch(`/api/settings/users/${targetId}/role`, {
      role: 'superadmin',
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toContain('Role must be either "admin" or "member"');
  });

  it('allows Owner to demote an Admin back to Member', async () => {
    const regRes = await adminClient.post('/api/auth/register', {
      email: 'admin-candidate@example.com',
      password: 'password123',
    });
    const targetId = (regRes.body as { user: { id: number } }).user.id;

    // Promote candidate to admin
    await ownerClient.patch(`/api/settings/users/${targetId}/role`, { role: 'admin' });

    // Verify admin can access settings
    const adminRes = await adminClient.get('/api/settings');
    expect(adminRes.status).toBe(200);

    // Owner demotes to member
    const demoteRes = await ownerClient.patch(`/api/settings/users/${targetId}/role`, {
      role: 'member',
    });
    expect(demoteRes.status).toBe(200);

    // Verify access is now forbidden
    const revokedRes = await adminClient.get('/api/settings');
    expect(revokedRes.status).toBe(403);
  });
});
