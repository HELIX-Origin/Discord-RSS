import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildAppDeps } from '../../helpers/app-deps.js';
import { startAppServer } from '../../helpers/server.js';
import { TestClient } from '../../helpers/http-client.js';
import type { BuiltAppDeps } from '../../helpers/app-deps.js';

describe('Auth API', () => {
  let ctx: BuiltAppDeps;
  let client: TestClient;

  beforeEach(async () => {
    ctx = await buildAppDeps();
    const server = await startAppServer(ctx.deps);
    client = new TestClient(server.url);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('registers and returns a session cookie', async () => {
    const res = await client.post('/api/auth/register', {
      email: 'user@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(client.cookie).toBeTruthy();
  });

  it('rejects duplicate registration', async () => {
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    const res = await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('logs in with valid credentials', async () => {
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    client.clearCookie();
    const res = await client.post('/api/auth/login', { email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(200);
  });

  it('rejects invalid login', async () => {
    await client.post('/api/auth/register', { email: 'user@example.com', password: 'password123' });
    client.clearCookie();
    const res = await client.post('/api/auth/login', { email: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
