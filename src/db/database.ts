import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA, SCHEMA_VERSION } from './schema.js';

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

  private constructor(db: DatabaseSync, dbPath: string) {
    this.db = db;
    this.dbPathValue = dbPath;
  }

  static open(dbPath: string): Database {
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    const instance = new Database(db, dbPath);
    instance.migrate();
    return instance;
  }

  private migrate(): void {
    this.db.exec(SCHEMA);
    this.db
      .prepare('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)')
      .run('schema_version', String(SCHEMA_VERSION));
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
    const sizeBytes = Number(pageRow?.page_count ?? 0) * 4096;
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