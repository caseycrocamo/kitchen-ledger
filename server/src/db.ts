import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  throw new Error('DB_PATH environment variable is required');
}

// Ensure the parent directory exists (dev/local mode may point at a fresh data dir).
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== '.') {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// No migration framework at this scale — this IF NOT EXISTS statement is the migration story.
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    servings INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 0),
    image_filename TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
