import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { db } from '../db';
import type { Item } from '../types';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'server/data/uploads';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, randomUUID() + extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

const CATEGORIES = ['main', 'side'] as const;
const LOCATIONS = ['fridge', 'freezer'] as const;

function isCategory(v: unknown): v is Item['category'] {
  return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);
}

function isLocation(v: unknown): v is Item['location'] {
  return typeof v === 'string' && (LOCATIONS as readonly string[]).includes(v);
}

function parseServings(v: unknown): number | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

async function deleteUploadFile(filename: string | null | undefined) {
  if (!filename) return;
  try {
    await unlink(join(UPLOADS_DIR, filename));
  } catch {
    // ignore missing file
  }
}

router.get('/', (_req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.json(items);
});

router.post('/', upload.single('image'), (req, res) => {
  const { name, category, location } = req.body as Record<string, string>;
  const servings = parseServings(req.body.servings ?? '1');

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
  if (servings === null) {
    res.status(400).json({ error: 'servings must be a non-negative integer' });
    return;
  }

  const image_filename = req.file ? req.file.filename : null;

  const result = db
    .prepare(
      `INSERT INTO items (name, category, location, servings, image_filename)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name.trim(), category, location, servings, image_filename);

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.patch('/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined;
  if (!existing) {
    res.status(404).json({ error: 'item not found' });
    return;
  }

  const body = req.body as Record<string, string>;
  const name = body.name !== undefined ? body.name : existing.name;
  const category = body.category !== undefined ? body.category : existing.category;
  const location = body.location !== undefined ? body.location : existing.location;
  const servings = body.servings !== undefined ? parseServings(body.servings) : existing.servings;

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
  if (servings === null) {
    res.status(400).json({ error: 'servings must be a non-negative integer' });
    return;
  }

  let image_filename = existing.image_filename;
  if (req.file) {
    await deleteUploadFile(existing.image_filename);
    image_filename = req.file.filename;
  } else if (body.removeImage === 'true') {
    await deleteUploadFile(existing.image_filename);
    image_filename = null;
  }

  db.prepare(
    `UPDATE items
     SET name = ?, category = ?, location = ?, servings = ?, image_filename = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(name.trim(), category, location, servings, image_filename, id);

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  res.json(item);
});

router.patch('/:id/servings', (req, res) => {
  const id = Number(req.params.id);
  const { delta } = req.body as { delta?: unknown };

  if (typeof delta !== 'number' || !Number.isInteger(delta)) {
    res.status(400).json({ error: 'delta must be an integer' });
    return;
  }

  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'item not found' });
    return;
  }

  db.prepare(
    `UPDATE items SET servings = MAX(0, servings + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(delta, id);

  const item = db.prepare('SELECT servings FROM items WHERE id = ?').get(id) as { servings: number };
  res.json({ servings: item.servings });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined;
  if (!existing) {
    res.status(404).json({ error: 'item not found' });
    return;
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  await deleteUploadFile(existing.image_filename);

  res.status(204).send();
});

export default router;
