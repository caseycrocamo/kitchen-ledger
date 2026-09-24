import { Pool } from 'pg';

import { SEED_TAG_NAMES } from './seedTags';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({ connectionString });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Postgres may still be starting up when this container does — retry the first connect. */
async function waitForDb(attempts = 20, delayMs = 1000): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === attempts) throw err;
      await sleep(delayMs);
    }
  }
}

/** No migration framework at this scale — these IF NOT EXISTS statements are the migration story. */
export async function initDb(): Promise<void> {
  await waitForDb();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      servings INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 0),
      image_filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  // Case-insensitive uniqueness (SQLite's COLLATE NOCASE equivalent).
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_lower ON tags (LOWER(name))`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, tag_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS serving_batches (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_serving_batches_item_created
    ON serving_batches (item_id, created_at)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS consumption_events (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      age_days INTEGER NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_consumption_events_occurred
    ON consumption_events (occurred_at)
  `);

  // Seed a starter set of location tags so the tag picker isn't empty on a fresh DB.
  // ON CONFLICT makes this a no-op once the tag exists (whether still in use or not).
  for (const name of SEED_TAG_NAMES) {
    await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT ((LOWER(name))) DO NOTHING', [name]);
  }

  // Launch-day backfill: any item with servings but no batch rows yet gets one batch
  // dated "now" — a no-op on every boot after the first covers it.
  await pool.query(`
    INSERT INTO serving_batches (item_id, quantity, created_at)
    SELECT id, servings, now()
    FROM items
    WHERE servings > 0
      AND id NOT IN (SELECT DISTINCT item_id FROM serving_batches)
  `);
}

export default pool;
