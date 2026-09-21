import fs from 'node:fs';
import path from 'node:path';

import { Router, type Request, type Response } from 'express';
import type { Multer } from 'multer';

import db from '../db';
import { addBatch, nowSql, removeFromBatches } from '../servingBatches';
import { getTagsForItems, setItemTags } from '../tags';
import type { Item } from '../types';

/** Accepts only strings of digits (no sign, no decimal point) — a strict non-negative integer. */
function parseServings(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Tags arrive as a JSON-encoded array inside the multipart FormData body. */
function parseTags(raw: unknown): string[] | null {
  if (typeof raw !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const tags: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'string') return null;
    const trimmed = entry.trim();
    if (!trimmed) return null;
    tags.push(trimmed);
  }
  return tags;
}

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function getUploadsDir(): string {
  const dir = process.env.UPLOADS_DIR;
  if (!dir) {
    throw new Error('UPLOADS_DIR environment variable is required');
  }
  return dir;
}

function deleteImageFile(filename: string | null | undefined): void {
  if (!filename) return;
  fs.rmSync(path.join(getUploadsDir(), filename), { force: true });
}

function getItemById(id: number): Item | undefined {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as
    | Omit<Item, 'tags'>
    | undefined;
  if (!row) return undefined;
  const tags = getTagsForItems([id]).get(id) ?? [];
  return { ...row, tags };
}

export function createItemsRouter(upload: Multer): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM items ORDER BY id').all() as Omit<Item, 'tags'>[];
    const tagsByItem = getTagsForItems(rows.map((row) => row.id));
    const items: Item[] = rows.map((row) => ({ ...row, tags: tagsByItem.get(row.id) ?? [] }));
    res.json(items);
  });

  router.post('/', upload.single('image'), (req: Request, res: Response) => {
    const { name } = req.body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const tags = parseTags(req.body.tags);
    if (!tags || tags.length === 0) {
      res.status(400).json({ error: 'tags must be a non-empty array of strings' });
      return;
    }

    let servings = 1;
    if (req.body.servings !== undefined && req.body.servings !== '') {
      const parsed = parseServings(req.body.servings);
      if (parsed === null) {
        res.status(400).json({ error: 'servings must be a non-negative integer' });
        return;
      }
      servings = parsed;
    }

    const imageFilename = req.file ? req.file.filename : null;

    const newId = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO items (name, servings, image_filename)
           VALUES (?, ?, ?)`,
        )
        .run(name.trim(), servings, imageFilename);
      const id = Number(result.lastInsertRowid);
      setItemTags(id, tags);
      if (servings > 0) addBatch(id, servings, nowSql());
      return id;
    })();

    const created = getItemById(newId);
    res.status(201).json(created);
  });

  router.patch('/:id', upload.single('image'), (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'item not found' });
      return;
    }
    const existing = getItemById(id);
    if (!existing) {
      res.status(404).json({ error: 'item not found' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({ error: 'name must be a non-empty string' });
        return;
      }
      updates.push('name = ?');
      values.push(body.name.trim());
    }

    let newTags: string[] | null = null;
    if (body.tags !== undefined) {
      const tags = parseTags(body.tags);
      if (!tags || tags.length === 0) {
        res.status(400).json({ error: 'tags must be a non-empty array of strings' });
        return;
      }
      newTags = tags;
    }

    let servingsDelta = 0;
    if (body.servings !== undefined) {
      const parsed = parseServings(body.servings);
      if (parsed === null) {
        res.status(400).json({ error: 'servings must be a non-negative integer' });
        return;
      }
      servingsDelta = parsed - existing.servings;
      updates.push('servings = ?');
      values.push(parsed);
    }

    const removeImage = body.removeImage === 'true' || body.removeImage === true;

    if (req.file) {
      deleteImageFile(existing.image_filename);
      updates.push('image_filename = ?');
      values.push(req.file.filename);
    } else if (removeImage) {
      deleteImageFile(existing.image_filename);
      updates.push('image_filename = ?');
      values.push(null);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    db.transaction(() => {
      const now = nowSql();
      db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
      if (newTags) setItemTags(id, newTags);
      if (servingsDelta > 0) addBatch(id, servingsDelta, now);
      else if (servingsDelta < 0) removeFromBatches(id, -servingsDelta, now, { log: false });
    })();

    res.json(getItemById(id));
  });

  router.patch('/:id/servings', (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'item not found' });
      return;
    }

    const { delta } = req.body as Record<string, unknown>;
    if (typeof delta !== 'number' || !Number.isFinite(delta) || !Number.isInteger(delta)) {
      res.status(400).json({ error: 'delta must be an integer' });
      return;
    }

    const changed = db.transaction(() => {
      const now = nowSql();
      const existing = db.prepare('SELECT servings FROM items WHERE id = ?').get(id) as
        | { servings: number }
        | undefined;
      if (!existing) return 0;

      const result = db
        .prepare(
          `UPDATE items SET servings = MAX(0, servings + ?), updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .run(delta, id);

      const actualDelta = Math.max(0, existing.servings + delta) - existing.servings;
      if (actualDelta > 0) addBatch(id, actualDelta, now);
      else if (actualDelta < 0) removeFromBatches(id, -actualDelta, now, { log: true });

      return result.changes;
    })();

    if (changed === 0) {
      res.status(404).json({ error: 'item not found' });
      return;
    }

    res.json(getItemById(id));
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'item not found' });
      return;
    }
    const existing = getItemById(id);
    if (!existing) {
      res.status(404).json({ error: 'item not found' });
      return;
    }

    deleteImageFile(existing.image_filename);
    db.prepare('DELETE FROM items WHERE id = ?').run(id);

    res.status(204).end();
  });

  return router;
}
