import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Database } from '../../src/db/database.js';
import type { LogLevel } from '../../src/util/logger.js';

let counter = 0;

export function getTestDataDir(): string {
  return process.env['DISCORD_RSS_TEST_DATA'] ?? resolve(process.cwd(), 'data', '.tmp');
}

export function testDbPath(prefix: string): string {
  counter += 1;
  return resolve(`${getTestDataDir()}/${prefix}-${process.pid}-${Date.now()}-${counter}.db`);
}

export function openTestDb(prefix: string, logLevel?: LogLevel): Database {
  const dir = getTestDataDir();
  mkdirSync(dir, { recursive: true });
  return Database.open(testDbPath(prefix), logLevel);
}

export async function closeTestDb(db: Database): Promise<void> {
  db.close();
}
