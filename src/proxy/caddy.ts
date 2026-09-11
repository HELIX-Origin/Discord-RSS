import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, chmodSync, rmSync, createWriteStream } from 'node:fs';
import { resolve, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createLogger, type Logger } from '../util/logger.js';

export const CADDY_DEFAULT_VERSION = '2.9.1';

export interface CaddyArchiveInfo {
  filename: string;
  url: string;
  isZip: boolean;
}

export function getCaddyArchiveInfo(
  version = CADDY_DEFAULT_VERSION,
  platform = process.platform,
  arch = process.arch,
): CaddyArchiveInfo | null {
  let osName: string;
  let archName: string;
  let isZip = false;

  switch (platform) {
    case 'win32':
      osName = 'windows';
      isZip = true;
      break;
    case 'linux':
      osName = 'linux';
      break;
    case 'darwin':
      osName = 'mac';
      break;
    default:
      return null;
  }

  switch (arch) {
    case 'x64':
      archName = 'amd64';
      break;
    case 'arm64':
      archName = 'arm64';
      break;
    case 'arm':
      archName = 'armv7';
      break;
    default:
      return null;
  }

  const ext = isZip ? 'zip' : 'tar.gz';
  const filename = `caddy_${version}_${osName}_${archName}.${ext}`;
  const url = `https://github.com/caddyserver/caddy/releases/download/v${version}/${filename}`;

  return { filename, url, isZip };
}

export function isCommandAvailable(command: string): boolean {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(checkCmd, [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function resolveCaddyBinary(dataDir: string): string | null {
  // 1. Check system PATH
  const exeName = process.platform === 'win32' ? 'caddy.exe' : 'caddy';
  if (isCommandAvailable(exeName)) {
    return exeName;
  }

  // 2. Check local data/bin directory
  const localBinary = resolve(dataDir, 'bin', exeName);
  if (existsSync(localBinary)) {
    return localBinary;
  }

  return null;
}

export async function ensureCaddyBinary(dataDir: string, logger?: Logger): Promise<string | null> {
  const log = logger ?? createLogger('caddy');
  const existing = resolveCaddyBinary(dataDir);
  if (existing) {
    return existing;
  }

  const binDir = resolve(dataDir, 'bin');
  mkdirSync(binDir, { recursive: true });

  const info = getCaddyArchiveInfo();
  if (!info) {
    log.warn('Automatic Caddy download unsupported on current platform/architecture', {
      platform: process.platform,
      arch: process.arch,
    });
    return null;
  }

  const archivePath = join(binDir, info.filename);
  const exeName = process.platform === 'win32' ? 'caddy.exe' : 'caddy';
  const targetBinary = join(binDir, exeName);

  log.info('Downloading official Caddy reverse proxy binary...', {
    version: CADDY_DEFAULT_VERSION,
    url: info.url,
  });

  try {
    const res = await fetch(info.url);
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const fileStream = createWriteStream(archivePath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await pipeline(Readable.fromWeb(res.body as any), fileStream);

    log.info('Extracting Caddy binary...');
    // tar command works across Windows 10+, Linux, and macOS
    execFileSync('tar', ['-xf', archivePath, '-C', binDir], { stdio: 'ignore' });

    if (process.platform !== 'win32' && existsSync(targetBinary)) {
      chmodSync(targetBinary, 0o755);
    }

    try {
      rmSync(archivePath, { force: true });
    } catch {
      // ignore archive cleanup failure
    }

    if (existsSync(targetBinary)) {
      log.info('Caddy reverse proxy installed successfully', { path: targetBinary });
      return targetBinary;
    }

    throw new Error('Extracted binary not found in target directory');
  } catch (err) {
    log.warn('Failed to download/install Caddy automatically', { error: String(err) });
    try {
      if (existsSync(archivePath)) rmSync(archivePath, { force: true });
    } catch {
      // ignore
    }
    return null;
  }
}

export interface CaddySupervisorOptions {
  caddyPath: string;
  caddyfilePath: string;
  publicUrl?: string | null;
  internalTarget: string;
  logger?: Logger;
}

export class CaddySupervisor {
  private process: ChildProcess | null = null;
  private readonly logger: Logger;

  constructor(private readonly options: CaddySupervisorOptions) {
    this.logger = options.logger ?? createLogger('caddy');
  }

  start(): void {
    if (this.process) return;

    const env = {
      ...process.env,
      PUBLIC_URL: this.options.publicUrl ?? 'localhost',
      INTERNAL_TARGET: this.options.internalTarget,
    };

    this.logger.info('Starting Caddy reverse proxy supervisor', {
      caddyPath: this.options.caddyPath,
      caddyfile: this.options.caddyfilePath,
      publicUrl: env['PUBLIC_URL'],
      internalTarget: env['INTERNAL_TARGET'],
    });

    try {
      this.process = spawn(this.options.caddyPath, ['run', '--config', this.options.caddyfilePath], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) this.logger.info(line);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) this.logger.info(line);
      });

      this.process.on('error', (err) => {
        this.logger.error('Caddy process encountered an error', undefined, err);
      });

      this.process.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          this.logger.warn('Caddy process exited', { code, signal });
        }
        this.process = null;
      });
    } catch (err) {
      this.logger.error('Failed to spawn Caddy process', undefined, err);
    }
  }

  stop(): void {
    if (!this.process) return;
    this.logger.info('Stopping Caddy reverse proxy');
    try {
      this.process.kill('SIGTERM');
    } catch {
      // ignore
    }
    this.process = null;
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
