import { Router, type Request, type Response } from 'express';

import { asyncHandler } from '../asyncHandler';
import pool from '../db';

export function createTagsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response) => {
      const { rows } = await pool.query<{ id: number; name: string; itemCount: string }>(
        `SELECT tags.id AS id, tags.name AS name, COUNT(item_tags.item_id) AS "itemCount"
         FROM tags
         LEFT JOIN item_tags ON item_tags.tag_id = tags.id
         GROUP BY tags.id
         ORDER BY tags.name`,
      );
      res.json(rows.map((row) => ({ ...row, itemCount: Number(row.itemCount) })));
    }),
  );

  return router;
}
