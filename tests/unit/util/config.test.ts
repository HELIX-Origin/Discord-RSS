import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../../../src/config.js';

describe('defaultConfig HTTPS_PORT and environment parsing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['HTTPS_PORT'];
    delete process.env['HTTPS_PROXY_PORT'];
    delete process.env['PING_URL'];
    delete process.env['PING_INTERVAL_MS'];
    delete process.env['CUSTOM_DOMAIN'];
    delete process.env['CUSTOM_URL'];
    delete process.env['PUBLIC_URL'];
    delete process.env['RENDER_EXTERNAL_URL'];
    delete process.env['RAILWAY_STATIC_URL'];
    delete process.env['RAILWAY_PUBLIC_DOMAIN'];
    delete process.env['FLY_APP_NAME'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('parses PING_URL and PING_INTERVAL_MS', () => {
    process.env['PING_URL'] = 'https://helix-rss.onrender.com/health';
    process.env['PING_INTERVAL_MS'] = '300000';
    const config = defaultConfig();
    expect(config.pingUrl).toBe('https://helix-rss.onrender.com/health');
    expect(config.pingIntervalMs).toBe(300_000);
  });

  it('auto-derives pingUrl from cloud host system (Render, Railway, Fly) when PING_URL is omitted', () => {
    delete process.env['PING_URL'];
    process.env['RENDER_EXTERNAL_URL'] = 'https://my-render-app.onrender.com';
    let config = defaultConfig();
    expect(config.pingUrl).toBe('https://my-render-app.onrender.com/health');

    delete process.env['RENDER_EXTERNAL_URL'];
    process.env['RAILWAY_STATIC_URL'] = 'railway-app.up.railway.app';
    config = defaultConfig();
    expect(config.pingUrl).toBe('https://railway-app.up.railway.app/health');

    delete process.env['RAILWAY_STATIC_URL'];
    process.env['FLY_APP_NAME'] = 'my-fly-app';
    config = defaultConfig();
    expect(config.pingUrl).toBe('https://my-fly-app.fly.dev/health');
  });

  it('disables pingUrl when PING_ENABLED=false or KEEP_ALIVE=false', () => {
    delete process.env['PING_URL'];
    process.env['PING_ENABLED'] = 'false';
    expect(defaultConfig().pingUrl).toBeNull();

    delete process.env['PING_ENABLED'];
    process.env['KEEP_ALIVE'] = 'false';
    expect(defaultConfig().pingUrl).toBeNull();
  });

  it('derives internalUrl and default pingUrl from host and port', () => {
    delete process.env['INTERNAL_URL'];
    delete process.env['DISCORD_PORT'];
    delete process.env['PING_URL'];
    const config = defaultConfig();
    expect(config.internalUrl).toBe('http://127.0.0.1:3131');
    expect(config.pingUrl).toBe('http://127.0.0.1:3131/health');
  });

  it('derives internalUrl when host is 0.0.0.0 using loopback', () => {
    process.env['INTERNAL_URL'] = '0.0.0.0';
    process.env['DISCORD_PORT'] = '8080';
    delete process.env['PING_URL'];
    const config = defaultConfig();
    expect(config.internalUrl).toBe('http://127.0.0.1:8080');
    expect(config.pingUrl).toBe('http://127.0.0.1:8080/health');
  });

  it('supports full URL in INTERNAL_URL and prefixes relative PING_URL', () => {
    process.env['INTERNAL_URL'] = 'http://internal.service:4000';
    process.env['PING_URL'] = '/healthz';
    const config = defaultConfig();
    expect(config.host).toBe('internal.service');
    expect(config.botPort).toBe(4000);
    expect(config.internalUrl).toBe('http://internal.service:4000');
    expect(config.pingUrl).toBe('http://internal.service:4000/healthz');
  });

  it('expands http://${INTERNAL_URL}:${DISCORD_PORT}/health using host and port', () => {
    process.env['INTERNAL_URL'] = '192.168.1.150';
    process.env['DISCORD_PORT'] = '5000';
    process.env['PING_URL'] = 'http://${INTERNAL_URL}:${DISCORD_PORT}/health';
    const config = defaultConfig();
    expect(config.host).toBe('192.168.1.150');
    expect(config.botPort).toBe(5000);
    expect(config.pingUrl).toBe('http://192.168.1.150:5000/health');
  });

  it('resolves bare host in PING_URL or ${INTERNAL_URL} to full health URL', () => {
    process.env['INTERNAL_URL'] = '10.0.0.2';
    process.env['DISCORD_PORT'] = '3131';
    process.env['PING_URL'] = '${INTERNAL_URL}';
    const config = defaultConfig();
    expect(config.pingUrl).toBe('http://10.0.0.2:3131/health');
  });

  it('binds PUBLIC_URL as publicBaseUrl and normalizes protocol/trailing slashes', () => {
    process.env['PUBLIC_URL'] = 'rss.example.com/';
    const config = defaultConfig();
    expect(config.publicBaseUrl).toBe('https://rss.example.com');
  });

  it('auto-detects cloud host URLs (Render, Railway, Fly.io)', () => {
    process.env['RENDER_EXTERNAL_URL'] = 'https://render-service.onrender.com';
    let config = defaultConfig();
    expect(config.cloudHostUrl).toBe('https://render-service.onrender.com');
    expect(config.publicBaseUrl).toBe('https://render-service.onrender.com');

    delete process.env['RENDER_EXTERNAL_URL'];
    process.env['RAILWAY_STATIC_URL'] = 'railway-app.up.railway.app';
    config = defaultConfig();
    expect(config.cloudHostUrl).toBe('https://railway-app.up.railway.app');
    expect(config.publicBaseUrl).toBe('https://railway-app.up.railway.app');

    delete process.env['RAILWAY_STATIC_URL'];
    process.env['FLY_APP_NAME'] = 'my-fly-rss';
    config = defaultConfig();
    expect(config.cloudHostUrl).toBe('https://my-fly-rss.fly.dev');
    expect(config.publicBaseUrl).toBe('https://my-fly-rss.fly.dev');
  });

  it('PUBLIC_URL overrides cloudHostUrl', () => {
    process.env['RENDER_EXTERNAL_URL'] = 'https://render-service.onrender.com';
    process.env['PUBLIC_URL'] = 'https://rss.custom.com:3443';
    const config = defaultConfig();
    expect(config.cloudHostUrl).toBe('https://render-service.onrender.com');
    expect(config.publicBaseUrl).toBe('https://rss.custom.com:3443');
  });

  it('supports PUBLIC_URL with domains and custom ports', () => {
    process.env['PUBLIC_URL'] = 'helix.local';
    let config = defaultConfig();
    expect(config.publicBaseUrl).toBe('https://helix.local');

    process.env['PUBLIC_URL'] = 'mybot.test:3443';
    config = defaultConfig();
    expect(config.publicBaseUrl).toBe('https://mybot.test:3443');

    process.env['PUBLIC_URL'] = 'singlewordhost';
    config = defaultConfig();
    expect(config.publicBaseUrl).toBe('https://singlewordhost');

    process.env['PUBLIC_URL'] = 'http://intranet.lan:8080/';
    config = defaultConfig();
    expect(config.publicBaseUrl).toBe('http://intranet.lan:8080');
  });

  it('supports CUSTOM_URL as fallback for PUBLIC_URL', () => {
    process.env['CUSTOM_URL'] = 'https://legacy-custom.org:3443';
    const config = defaultConfig();
    expect(config.publicBaseUrl).toBe('https://legacy-custom.org:3443');
  });

  it('derives botPort from INTERNAL_URL host:port', () => {
    process.env['INTERNAL_URL'] = '127.0.0.1:8080';
    const config = defaultConfig();
    expect(config.host).toBe('127.0.0.1');
    expect(config.botPort).toBe(8080);
    expect(config.internalUrl).toBe('http://127.0.0.1:8080');
  });

  it('supports formats like https:your-domain.com and configures callbackUrl', () => {
    process.env['INTERNAL_URL'] = '127.0.0.1:3131';
    process.env['PUBLIC_URL'] = 'https:your-domain.com';
    const config = defaultConfig();
    expect(config.publicBaseUrl).toBe('https://your-domain.com');
    expect(config.callbackUrl).toBe('https://your-domain.com/api/auth/callback/discord');
  });

  it('supports custom INTERNAL_URL with PUBLIC_URL', () => {
    process.env['INTERNAL_URL'] = '0.0.0.0:8000';
    process.env['PUBLIC_URL'] = 'https:my-domain.com';
    const config = defaultConfig();
    expect(config.botPort).toBe(8000);
    expect(config.publicBaseUrl).toBe('https://my-domain.com');
  });
});
