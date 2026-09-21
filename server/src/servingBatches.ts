import db from './db';

/** Matches SQLite's CURRENT_TIMESTAMP format ("YYYY-MM-DD HH:MM:SS", UTC). */
export function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function daysBetween(from: string, to: string): number {
  const fromMs = new Date(from.replace(' ', 'T') + 'Z').getTime();
  const toMs = new Date(to.replace(' ', 'T') + 'Z').getTime();
  return Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)));
}

export function addBatch(itemId: number, quantity: number, now: string): void {
  if (quantity <= 0) return;
  db.prepare(
    `INSERT INTO serving_batches (item_id, quantity, created_at) VALUES (?, ?, ?)`,
  ).run(itemId, quantity, now);
}

export function removeFromBatches(
  itemId: number,
  quantity: number,
  now: string,
  { log }: { log: boolean },
): void {
  let remaining = quantity;
  if (remaining <= 0) return;

  const batches = db
    .prepare(
      `SELECT id, quantity, created_at FROM serving_batches
       WHERE item_id = ? ORDER BY created_at ASC, id ASC`,
    )
    .all(itemId) as { id: number; quantity: number; created_at: string }[];

  const updateBatch = db.prepare('UPDATE serving_batches SET quantity = ? WHERE id = ?');
  const deleteBatch = db.prepare('DELETE FROM serving_batches WHERE id = ?');
  const insertEvent = db.prepare(
    `INSERT INTO consumption_events (item_id, quantity, age_days, occurred_at) VALUES (?, ?, ?, ?)`,
  );

  for (const batch of batches) {
    if (remaining <= 0) break;
    const taken = Math.min(batch.quantity, remaining);
    remaining -= taken;

    if (taken === batch.quantity) {
      deleteBatch.run(batch.id);
    } else {
      updateBatch.run(batch.quantity - taken, batch.id);
    }

    if (log) {
      insertEvent.run(itemId, taken, daysBetween(batch.created_at, now), now);
    }
  }
}

export function getOldestBatchAgeDays(itemId: number, now: string): number | null {
  const row = db
    .prepare('SELECT MIN(created_at) AS oldest FROM serving_batches WHERE item_id = ?')
    .get(itemId) as { oldest: string | null };
  if (!row.oldest) return null;
  return daysBetween(row.oldest, now);
}
