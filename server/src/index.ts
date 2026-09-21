import express from 'express';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import itemsRouter from './routes/items';

const PORT = Number(process.env.PORT ?? 3001);
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'server/data/uploads';

mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(express.json());

app.use('/api/uploads', express.static(join(process.cwd(), UPLOADS_DIR)));
app.use('/api/items', itemsRouter);

app.listen(PORT, () => {
  console.log(`kitchen-ledger server listening on port ${PORT}`);
});
