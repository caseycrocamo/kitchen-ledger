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
db.pragma('foreign_keys = ON');

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

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
  )
`);

// One-time migration: fold the old category/location columns into tags, then drop them.
// Gated on column presence, so this whole block is a no-op on every boot after the first.
const itemColumns = db.prepare('PRAGMA table_info(items)').all() as { name: string }[];
const hasCategory = itemColumns.some((col) => col.name === 'category');
const hasLocation = itemColumns.some((col) => col.name === 'location');

if (hasCategory || hasLocation) {
  const migrate = db.transaction(() => {
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    const findTag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');
    const linkTag = db.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)');

    const rows = db
      .prepare(`SELECT id${hasCategory ? ', category' : ''}${hasLocation ? ', location' : ''} FROM items`)
      .all() as { id: number; category?: string; location?: string }[];

    for (const row of rows) {
      for (const value of [row.category, row.location]) {
        if (!value) continue;
        insertTag.run(value);
        const tag = findTag.get(value) as { id: number };
        linkTag.run(row.id, tag.id);
      }
    }

    if (hasCategory) db.exec('ALTER TABLE items DROP COLUMN category');
    if (hasLocation) db.exec('ALTER TABLE items DROP COLUMN location');
  });
  migrate();
}

export default db;
