import { Router, type Request, type Response } from 'express';

import db from '../db';

export function createTagsRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const tags = db
      .prepare(
        `SELECT tags.id AS id, tags.name AS name, COUNT(item_tags.item_id) AS itemCount
         FROM tags
         LEFT JOIN item_tags ON item_tags.tag_id = tags.id
         GROUP BY tags.id
         ORDER BY tags.name`,
      )
      .all();
    res.json(tags);
  });

  return router;
}
