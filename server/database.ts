import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type Database = DatabaseSync;

export function createDatabase(dbPath = process.env.DB_PATH ?? './data/leads.db'): Database {
  const resolvedPath = dbPath === ':memory:' ? dbPath : resolve(dbPath);
  if (resolvedPath !== ':memory:') mkdirSync(dirname(resolvedPath), { recursive: true });

  const db = new DatabaseSync(resolvedPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK(length(trim(name)) >= 2),
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK(length(trim(name)) >= 2),
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT NOT NULL,
      company TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Other')),
      status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Qualified', 'Lost')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  const leadColumns = db.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>;
  if (!leadColumns.some((column) => column.name === 'user_id')) {
    db.exec('ALTER TABLE leads ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_leads_user_name ON leads(user_id, name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_leads_user_created_at ON leads(user_id, created_at DESC);
  `);
  return db;
}
