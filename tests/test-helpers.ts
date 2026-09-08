import { resolve } from 'node:path';

let counter = 0;

export function getTestDataDir(): string {
  return process.env.DISCORD_RSS_TEST_DATA ?? 'data/.tmp';
}

export function testDbPath(prefix: string): string {
  counter += 1;
  return resolve(`${getTestDataDir()}/${prefix}-${process.pid}-${Date.now()}-${counter}.db`);
}

export function testSmokeDataDir(): string {
  return resolve(`${getTestDataDir()}/smoke-run`);
}