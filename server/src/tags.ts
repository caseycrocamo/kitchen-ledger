import type { PoolClient } from 'pg';

import pool from './db';
import { SEED_TAG_NAMES } from './seedTags';

function normalizeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export async function findOrCreateTagIds(client: PoolClient, names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of normalizeNames(names)) {
    await client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT ((LOWER(name))) DO NOTHING', [name]);
    const { rows } = await client.query('SELECT id FROM tags WHERE LOWER(name) = LOWER($1)', [name]);
    ids.push(rows[0].id);
  }
  return ids;
}

/** Must run on the same client/transaction as the item write it accompanies. */
export async function setItemTags(client: PoolClient, itemId: number, names: string[]): Promise<void> {
  const tagIds = await findOrCreateTagIds(client, names);

  await client.query('DELETE FROM item_tags WHERE item_id = $1', [itemId]);
  for (const tagId of tagIds) {
    await client.query('INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)', [itemId, tagId]);
  }

  // Starter tags stick around even unused, so the picker always offers them; anything
  // else that's fallen out of use (a custom tag whose last item was retagged) is pruned.
  const seedPlaceholders = SEED_TAG_NAMES.map((_, i) => `LOWER($${i + 1})`).join(', ');
  await client.query(
    `DELETE FROM tags
     WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)
       AND LOWER(name) NOT IN (${seedPlaceholders})`,
    SEED_TAG_NAMES,
  );
}

export async function getTagsForItems(itemIds: number[]): Promise<Map<number, string[]>> {
  const result = new Map<number, string[]>();
  if (itemIds.length === 0) return result;

  const placeholders = itemIds.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `SELECT item_tags.item_id AS "itemId", tags.name AS name
     FROM item_tags
     JOIN tags ON tags.id = item_tags.tag_id
     WHERE item_tags.item_id IN (${placeholders})
     ORDER BY tags.name`,
    itemIds,
  );

  for (const row of rows) {
    const existing = result.get(row.itemId);
    if (existing) {
      existing.push(row.name);
    } else {
      result.set(row.itemId, [row.name]);
    }
  }
  return result;
}
