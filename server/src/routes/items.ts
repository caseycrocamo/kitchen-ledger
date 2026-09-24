import fs from 'node:fs';
import path from 'node:path';

import { Router, type Request, type Response } from 'express';
import type { Multer } from 'multer';

import { asyncHandler } from '../asyncHandler';
import pool from '../db';
import { addBatch, removeFromBatches } from '../servingBatches';
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

async function getItemById(id: number): Promise<Item | undefined> {
  const { rows } = await pool.query<Omit<Item, 'tags'>>('SELECT * FROM items WHERE id = $1', [id]);
  const row = rows[0];
  if (!row) return undefined;
  const tagsByItem = await getTagsForItems([id]);
  return { ...row, tags: tagsByItem.get(id) ?? [] };
}

export function createItemsRouter(upload: Multer): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response) => {
      const { rows } = await pool.query<Omit<Item, 'tags'>>('SELECT * FROM items ORDER BY id');
      const tagsByItem = await getTagsForItems(rows.map((row) => row.id));
      const items: Item[] = rows.map((row) => ({ ...row, tags: tagsByItem.get(row.id) ?? [] }));
      res.json(items);
    }),
  );

  router.post(
    '/',
    upload.single('image'),
    asyncHandler(async (req: Request, res: Response) => {
      const { name } = req.body as Record<string, unknown>;

      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const tags = parseTags(req.body.tags);
      if (!tags) {
        res.status(400).json({ error: 'tags must be an array of strings' });
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
      const now = new Date();

      const client = await pool.connect();
      let newId: number;
      try {
        await client.query('BEGIN');
        const result = await client.query<{ id: number }>(
          `INSERT INTO items (name, servings, image_filename) VALUES ($1, $2, $3) RETURNING id`,
          [name.trim(), servings, imageFilename],
        );
        newId = result.rows[0].id;
        await setItemTags(client, newId, tags);
        if (servings > 0) await addBatch(client, newId, servings, now);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const created = await getItemById(newId);
      res.status(201).json(created);
    }),
  );

  router.patch(
    '/:id',
    upload.single('image'),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseId(req.params.id);
      if (id === null) {
        res.status(404).json({ error: 'item not found' });
        return;
      }
      const existing = await getItemById(id);
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
        values.push(body.name.trim());
        updates.push(`name = $${values.length}`);
      }

      let newTags: string[] | null = null;
      if (body.tags !== undefined) {
        const tags = parseTags(body.tags);
        if (!tags) {
          res.status(400).json({ error: 'tags must be an array of strings' });
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
        values.push(parsed);
        updates.push(`servings = $${values.length}`);
      }

      const removeImage = body.removeImage === 'true' || body.removeImage === true;

      if (req.file) {
        deleteImageFile(existing.image_filename);
        values.push(req.file.filename);
        updates.push(`image_filename = $${values.length}`);
      } else if (removeImage) {
        deleteImageFile(existing.image_filename);
        values.push(null);
        updates.push(`image_filename = $${values.length}`);
      }

      updates.push('updated_at = now()');

      const now = new Date();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        values.push(id);
        await client.query(`UPDATE items SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
        if (newTags) await setItemTags(client, id, newTags);
        if (servingsDelta > 0) await addBatch(client, id, servingsDelta, now);
        else if (servingsDelta < 0) await removeFromBatches(client, id, -servingsDelta, now, { log: false });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      res.json(await getItemById(id));
    }),
  );

  router.patch(
    '/:id/servings',
    asyncHandler(async (req: Request, res: Response) => {
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

      const now = new Date();
      const client = await pool.connect();
      let found = true;
      try {
        await client.query('BEGIN');
        const { rows } = await client.query<{ servings: number }>(
          'SELECT servings FROM items WHERE id = $1 FOR UPDATE',
          [id],
        );
        const existing = rows[0];
        if (!existing) {
          found = false;
        } else {
          const newServings = Math.max(0, existing.servings + delta);
          await client.query('UPDATE items SET servings = $1, updated_at = now() WHERE id = $2', [
            newServings,
            id,
          ]);

          const actualDelta = newServings - existing.servings;
          if (actualDelta > 0) await addBatch(client, id, actualDelta, now);
          else if (actualDelta < 0) await removeFromBatches(client, id, -actualDelta, now, { log: true });
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      if (!found) {
        res.status(404).json({ error: 'item not found' });
        return;
      }

      res.json(await getItemById(id));
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseId(req.params.id);
      if (id === null) {
        res.status(404).json({ error: 'item not found' });
        return;
      }
      const existing = await getItemById(id);
      if (!existing) {
        res.status(404).json({ error: 'item not found' });
        return;
      }

      deleteImageFile(existing.image_filename);
      await pool.query('DELETE FROM items WHERE id = $1', [id]);

      res.status(204).end();
    }),
  );

  return router;
}
