import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import express, { type ErrorRequestHandler } from 'express';
import multer, { MulterError } from 'multer';

import { createItemsRouter } from './routes/items';
import { createTagsRouter } from './routes/tags';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const UPLOADS_DIR = process.env.UPLOADS_DIR;
if (!UPLOADS_DIR) {
  throw new Error('UPLOADS_DIR environment variable is required');
}

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, crypto.randomUUID() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image uploads are allowed'));
    }
  },
});

const app = express();
app.use(express.json());
app.use('/api/uploads', express.static(UPLOADS_DIR));
app.use('/api/items', createItemsRouter(upload));
app.use('/api/tags', createTagsRouter());

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error && err.message === 'Only image uploads are allowed') {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`kitchen-ledger server listening on port ${PORT}`);
});
