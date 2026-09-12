import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA, SCHEMA_VERSION } from './schema.js';
import { createLogger, type LogLevel } from '../util/logger.js';

export interface DbStats {
  feedCount: number;
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
      this.db.exec('ALTER TABLE feeds ADD COLUMN guild_id TEXT;');
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_feeds_guild ON feeds(guild_id);');
    } catch {
      // Index may already exist
    }

    try {
      this.db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';");
    } catch {
      // Column may already exist
    }

    // Schema v5: per-feed thread tracking
    try {
      this.db.exec('ALTER TABLE feeds ADD COLUMN thread_channel_id TEXT;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.exec('ALTER TABLE feeds ADD COLUMN thread_entry_count INTEGER NOT NULL DEFAULT 0;');
    } catch {
      // Column may already exist
    }
    // Schema v5: per-guild thread delivery configuration
    try {
      this.db.exec('ALTER TABLE discord_guilds ADD COLUMN threads_enabled INTEGER NOT NULL DEFAULT 0;');
    } catch {
      // Column may already exist
    }
    try {
      this.db.exec("ALTER TABLE discord_guilds ADD COLUMN forum_channel_ids TEXT NOT NULL DEFAULT '[]';");
    } catch {
      // Column may already exist
    }

    // Schema v6: per-guild category targets (rss / reddit / freegames)
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS guild_categories (
          guild_id TEXT NOT NULL,
          category TEXT NOT NULL,
          channel_id TEXT,
          thread_channel_id TEXT,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (guild_id, category),
          FOREIGN KEY (guild_id) REFERENCES discord_guilds(guild_id) ON DELETE CASCADE
        );
      `);
    } catch {
      // Table may already exist
    }
    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_guild_categories_guild ON guild_categories(guild_id);');
    } catch {
      // Index may already exist
    }
    // Fix oauth_states user_id nullability if created under legacy schema
    try {
      const info = this.db.prepare('PRAGMA table_info(oauth_states)').all() as Array<{
        name: string;
        notnull: number;
      }>;
      const userIdCol = info.find((c) => c.name === 'user_id');
      const providerCol = info.find((c) => c.name === 'provider');
      if (userIdCol && userIdCol.notnull === 1) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS oauth_states_migrated (
            state TEXT PRIMARY KEY,
            user_id INTEGER,
            provider TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
          );
          INSERT OR IGNORE INTO oauth_states_migrated (state, user_id, provider, created_at)
            SELECT state, user_id, ${providerCol ? 'provider' : "''"}, created_at FROM oauth_states;
          DROP TABLE oauth_states;
          ALTER TABLE oauth_states_migrated RENAME TO oauth_states;
        `);
      } else if (!providerCol) {
        this.db.exec("ALTER TABLE oauth_states ADD COLUMN provider TEXT NOT NULL DEFAULT '';");
      }
    } catch (err) {
      this.logger.warn('Failed to verify/migrate oauth_states table', { err: (err as Error).message });
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
    const sentCount = count('SELECT COUNT(*) AS c FROM sent_entries');
    const pageRow = this.db.prepare('PRAGMA page_count').get() as { page_count?: number | bigint } | undefined;
    const pageSizeRow = this.db.prepare('PRAGMA page_size').get() as { page_size?: number | bigint } | undefined;
    const sizeBytes = Number(pageRow?.page_count ?? 0) * Number(pageSizeRow?.page_size ?? 4096);
    return {
      feedCount,
      sentCount,
      dbSizeBytes: sizeBytes,
      dbPath: this.dbPathValue,
    };
  }

  close(): void {
    this.db.close();
  }
}
