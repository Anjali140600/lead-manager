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
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK(length(trim(name)) >= 2),
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT NOT NULL,
      company TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Other')),
      status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Qualified', 'Lost')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  `);
  return db;
}
