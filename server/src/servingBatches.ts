import type { PoolClient } from 'pg';

import pool from './db';

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Must run on the same client/transaction as the item write it accompanies. */
export async function addBatch(client: PoolClient, itemId: number, quantity: number, now: Date): Promise<void> {
  if (quantity <= 0) return;
  await client.query('INSERT INTO serving_batches (item_id, quantity, created_at) VALUES ($1, $2, $3)', [
    itemId,
    quantity,
    now,
  ]);
}

/** Must run on the same client/transaction as the item write it accompanies. */
export async function removeFromBatches(
  client: PoolClient,
  itemId: number,
  quantity: number,
  now: Date,
  { log }: { log: boolean },
): Promise<void> {
  let remaining = quantity;
  if (remaining <= 0) return;

  const { rows: batches } = await client.query<{ id: number; quantity: number; created_at: Date }>(
    `SELECT id, quantity, created_at FROM serving_batches
     WHERE item_id = $1 ORDER BY created_at ASC, id ASC`,
    [itemId],
  );

  for (const batch of batches) {
    if (remaining <= 0) break;
    const taken = Math.min(batch.quantity, remaining);
    remaining -= taken;

    if (taken === batch.quantity) {
      await client.query('DELETE FROM serving_batches WHERE id = $1', [batch.id]);
    } else {
      await client.query('UPDATE serving_batches SET quantity = $1 WHERE id = $2', [batch.quantity - taken, batch.id]);
    }

    if (log) {
      await client.query(
        'INSERT INTO consumption_events (item_id, quantity, age_days, occurred_at) VALUES ($1, $2, $3, $4)',
        [itemId, taken, daysBetween(new Date(batch.created_at), now), now],
      );
    }
  }
}

export async function getOldestBatchAgeDays(itemId: number, now: Date): Promise<number | null> {
  const { rows } = await pool.query<{ oldest: Date | null }>(
    'SELECT MIN(created_at) AS oldest FROM serving_batches WHERE item_id = $1',
    [itemId],
  );
  const oldest = rows[0]?.oldest;
  if (!oldest) return null;
  return daysBetween(new Date(oldest), now);
}
