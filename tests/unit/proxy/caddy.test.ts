import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCaddyArchiveInfo, CaddySupervisor, CADDY_DEFAULT_VERSION } from '../../../src/proxy/caddy.js';

describe('Caddy proxy utilities', () => {
  it('returns valid archive metadata for supported platforms', () => {
    const winInfo = getCaddyArchiveInfo('2.9.1', 'win32', 'x64');
    expect(winInfo).not.toBeNull();
    expect(winInfo?.filename).toBe('caddy_2.9.1_windows_amd64.zip');
    expect(winInfo?.isZip).toBe(true);
    expect(winInfo?.url).toContain('caddy_2.9.1_windows_amd64.zip');

    const linuxInfo = getCaddyArchiveInfo('2.9.1', 'linux', 'x64');
    expect(linuxInfo).not.toBeNull();
    expect(linuxInfo?.filename).toBe('caddy_2.9.1_linux_amd64.tar.gz');
    expect(linuxInfo?.isZip).toBe(false);

    const macInfo = getCaddyArchiveInfo('2.9.1', 'darwin', 'arm64');
    expect(macInfo).not.toBeNull();
    expect(macInfo?.filename).toBe('caddy_2.9.1_mac_arm64.tar.gz');
    expect(macInfo?.isZip).toBe(false);
  });

  it('returns null for unsupported platform or architecture', () => {
    expect(getCaddyArchiveInfo('2.9.1', 'sunos' as NodeJS.Platform, 'x64')).toBeNull();
    expect(getCaddyArchiveInfo('2.9.1', 'linux', 's390x' as NodeJS.Architecture)).toBeNull();
  });

  it('uses default version when version is omitted', () => {
    const info = getCaddyArchiveInfo(undefined, 'linux', 'x64');
    expect(info?.filename).toContain(CADDY_DEFAULT_VERSION);
  });
});

describe('CaddySupervisor', () => {
  let supervisor: CaddySupervisor;

  beforeEach(() => {
    supervisor = new CaddySupervisor({
      caddyPath: 'caddy',
      caddyfilePath: './Caddyfile',
      publicUrl: 'https://test.example.com',
      internalTarget: '127.0.0.1:3131',
    });
  });

  afterEach(() => {
    supervisor.stop();
  });

  it('reports isRunning as false before start', () => {
    expect(supervisor.isRunning()).toBe(false);
  });

  it('cleans up cleanly on stop', () => {
    supervisor.stop();
    expect(supervisor.isRunning()).toBe(false);
  });
});
