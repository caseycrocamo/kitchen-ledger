import fs from 'node:fs';
import path from 'node:path';

import { Router, type Request, type Response } from 'express';
import type { Multer } from 'multer';

import db from '../db';
import type { Category, Item, Location } from '../types';

const CATEGORIES: readonly Category[] = ['main', 'side'];
const LOCATIONS: readonly Location[] = ['fridge', 'freezer'];

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

function isLocation(value: unknown): value is Location {
  return typeof value === 'string' && (LOCATIONS as readonly string[]).includes(value);
}

/** Accepts only strings of digits (no sign, no decimal point) — a strict non-negative integer. */
function parseServings(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
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
  return db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined;
}

export function createItemsRouter(upload: Multer): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const items = db.prepare('SELECT * FROM items ORDER BY id').all();
    res.json(items);
  });

  router.post('/', upload.single('image'), (req: Request, res: Response) => {
    const { name, category, location } = req.body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (!isCategory(category)) {
      res.status(400).json({ error: "category must be 'main' or 'side'" });
      return;
    }
    if (!isLocation(location)) {
      res.status(400).json({ error: "location must be 'fridge' or 'freezer'" });
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

    const result = db
      .prepare(
        `INSERT INTO items (name, category, location, servings, image_filename)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(name.trim(), category, location, servings, imageFilename);

    const created = getItemById(Number(result.lastInsertRowid));
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

    if (body.category !== undefined) {
      if (!isCategory(body.category)) {
        res.status(400).json({ error: "category must be 'main' or 'side'" });
        return;
      }
      updates.push('category = ?');
      values.push(body.category);
    }

    if (body.location !== undefined) {
      if (!isLocation(body.location)) {
        res.status(400).json({ error: "location must be 'fridge' or 'freezer'" });
        return;
      }
      updates.push('location = ?');
      values.push(body.location);
    }

    if (body.servings !== undefined) {
      const parsed = parseServings(body.servings);
      if (parsed === null) {
        res.status(400).json({ error: 'servings must be a non-negative integer' });
        return;
      }
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

    db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);

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

    const result = db
      .prepare(
        `UPDATE items SET servings = MAX(0, servings + ?), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(delta, id);

    if (result.changes === 0) {
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
