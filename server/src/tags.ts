import db from './db';
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

export function findOrCreateTagIds(names: string[]): number[] {
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const findTag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE');

  return normalizeNames(names).map((name) => {
    insertTag.run(name);
    const tag = findTag.get(name) as { id: number };
    return tag.id;
  });
}

export function setItemTags(itemId: number, names: string[]): void {
  const tagIds = findOrCreateTagIds(names);

  db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId);

  const linkTag = db.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) {
    linkTag.run(itemId, tagId);
  }

  // Starter tags stick around even unused, so the picker always offers them; anything
  // else that's fallen out of use (a custom tag whose last item was retagged) is pruned.
  const seedPlaceholders = SEED_TAG_NAMES.map(() => '?').join(', ');
  db.prepare(
    `DELETE FROM tags
     WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)
       AND name NOT IN (${seedPlaceholders}) COLLATE NOCASE`,
  ).run(...SEED_TAG_NAMES);
}

export function getTagsForItems(itemIds: number[]): Map<number, string[]> {
  const result = new Map<number, string[]>();
  if (itemIds.length === 0) return result;

  const placeholders = itemIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT item_tags.item_id AS itemId, tags.name AS name
       FROM item_tags
       JOIN tags ON tags.id = item_tags.tag_id
       WHERE item_tags.item_id IN (${placeholders})
       ORDER BY tags.name`,
    )
    .all(...itemIds) as { itemId: number; name: string }[];

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
