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

  it('enables Caddy by default and respects CADDY_ENABLED toggle', () => {
    expect(defaultConfig().caddyEnabled).toBe(true);

    process.env['CADDY_ENABLED'] = 'false';
    expect(defaultConfig().caddyEnabled).toBe(false);

    process.env['CADDY_ENABLED'] = 'off';
    expect(defaultConfig().caddyEnabled).toBe(false);

    process.env['CADDY_ENABLED'] = 'disabled';
    expect(defaultConfig().caddyEnabled).toBe(false);

    process.env['CADDY_ENABLED'] = '0';
    expect(defaultConfig().caddyEnabled).toBe(false);

    process.env['CADDY_ENABLED'] = 'true';
    expect(defaultConfig().caddyEnabled).toBe(true);
  });

  it('disables Caddy when native SSL certificates are configured unless explicitly enabled', () => {
    delete process.env['CADDY_ENABLED'];
    process.env['SITE_SSL_KEY'] = '/path/to/key.pem';
    process.env['SITE_SSL_CERT'] = '/path/to/cert.pem';
    expect(defaultConfig().caddyEnabled).toBe(false);

    process.env['CADDY_ENABLED'] = 'true';
    expect(defaultConfig().caddyEnabled).toBe(true);
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
