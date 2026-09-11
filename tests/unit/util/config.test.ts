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

  it('defaults httpsProxyPort to 3443 when unset', () => {
    const config = defaultConfig();
    expect(config.httpsProxyPort).toBe(3443);
  });

  it('reads httpsProxyPort from HTTPS_PORT', () => {
    process.env['HTTPS_PORT'] = '8443';
    const config = defaultConfig();
    expect(config.httpsProxyPort).toBe(8443);
  });

  it('reads httpsProxyPort from HTTPS_PROXY_PORT if HTTPS_PORT is unset', () => {
    process.env['HTTPS_PROXY_PORT'] = '9443';
    const config = defaultConfig();
    expect(config.httpsProxyPort).toBe(9443);
  });

  it('disables httpsProxyPort when set to 0, none, off, or disabled', () => {
    process.env['HTTPS_PORT'] = '0';
    expect(defaultConfig().httpsProxyPort).toBeNull();

    process.env['HTTPS_PORT'] = 'none';
    expect(defaultConfig().httpsProxyPort).toBeNull();

    process.env['HTTPS_PORT'] = 'disabled';
    expect(defaultConfig().httpsProxyPort).toBeNull();

    process.env['HTTPS_PORT'] = 'off';
    expect(defaultConfig().httpsProxyPort).toBeNull();

    process.env['HTTPS_PORT'] = 'false';
    expect(defaultConfig().httpsProxyPort).toBeNull();
  });

  it('parses PING_URL and PING_INTERVAL_MS', () => {
    process.env['PING_URL'] = 'https://helix-rss.onrender.com/health';
    process.env['PING_INTERVAL_MS'] = '300000';
    const config = defaultConfig();
    expect(config.pingUrl).toBe('https://helix-rss.onrender.com/health');
    expect(config.pingIntervalMs).toBe(300_000);
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

  it('binds CUSTOM_URL as publicBaseUrl and normalizes protocol/trailing slashes', () => {
    process.env['CUSTOM_URL'] = 'rss.example.com/';
    const config = defaultConfig();
    expect(config.customUrl).toBe('https://rss.example.com');
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

  it('CUSTOM_URL overrides cloudHostUrl and PUBLIC_URL', () => {
    process.env['RENDER_EXTERNAL_URL'] = 'https://render-service.onrender.com';
    process.env['PUBLIC_URL'] = 'https://fallback.example.com';
    process.env['CUSTOM_URL'] = 'https://rss.custom.com';
    const config = defaultConfig();
    expect(config.customUrl).toBe('https://rss.custom.com');
    expect(config.cloudHostUrl).toBe('https://render-service.onrender.com');
    expect(config.publicBaseUrl).toBe('https://rss.custom.com');
  });
});
