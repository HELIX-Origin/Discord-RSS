import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA, SCHEMA_VERSION } from './schema.js';
import { createLogger, type LogLevel } from '../util/logger.js';

export interface DbStats {
  feedCount: number;
  webhookCount: number;
  monitorCount: number;
  sentCount: number;
  dbSizeBytes: number;
  dbPath: string;
}

export class Database {
  private db: DatabaseSync;
  private readonly dbPathValue: string;
  private readonly logger;

  private constructor(db: DatabaseSync, dbPath: string, logLevel?: LogLevel) {
    this.db = db;
    this.dbPathValue = dbPath;
    this.logger = createLogger('db', logLevel);
  }

  static open(dbPath: string, logLevel?: LogLevel): Database {
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    const instance = new Database(db, dbPath, logLevel);
    instance.migrate();
    return instance;
  }

  private migrate(): void {
    this.db.exec(SCHEMA);
    try {
      this.db.exec('ALTER TABLE feeds ADD COLUMN channel_id TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.exec('ALTER TABLE site_status ADD COLUMN channel_id TEXT;');
    } catch {
      // Column may already exist
    }
    this.db
      .prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
      .run('schema_version', String(SCHEMA_VERSION));
    this.logger.debug('Database migrated', { schemaVersion: SCHEMA_VERSION, dbPath: this.dbPathValue });
  }

  get raw(): DatabaseSync {
    return this.db;
  }

  stats(): DbStats {
    const count = (sql: string): number => {
      const row = this.db.prepare(sql).get() as { c?: number | bigint } | undefined;
      return Number(row?.c ?? 0);
    };
    const feedCount = count('SELECT COUNT(*) AS c FROM feeds');
    const webhookCount = count('SELECT COUNT(*) AS c FROM webhooks');
    const monitorCount = count('SELECT COUNT(*) AS c FROM site_status');
    const sentCount = count('SELECT COUNT(*) AS c FROM sent_entries');
    const pageRow = this.db.prepare('PRAGMA page_count').get() as { page_count?: number | bigint } | undefined;
    const pageSizeRow = this.db.prepare('PRAGMA page_size').get() as { page_size?: number | bigint } | undefined;
    const sizeBytes = Number(pageRow?.page_count ?? 0) * Number(pageSizeRow?.page_size ?? 4096);
    return {
      feedCount,
      webhookCount,
      monitorCount,
      sentCount,
      dbSizeBytes: sizeBytes,
      dbPath: this.dbPathValue,
    };
  }

  close(): void {
    this.db.close();
  }
}
