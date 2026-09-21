import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  throw new Error('DB_PATH environment variable is required');
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// No migration framework at this scale — CREATE TABLE IF NOT EXISTS is the migration story.
// category/location intentionally have no CHECK constraint; the enum is enforced in the API layer.
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
