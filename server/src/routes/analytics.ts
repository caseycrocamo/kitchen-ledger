import { Router, type Request, type Response } from 'express';

import db from '../db';
import { getOldestBatchAgeDays, nowSql } from '../servingBatches';
import { getTagsForItems } from '../tags';
import type { Item } from '../types';

function parseDays(raw: unknown): number {
  if (typeof raw !== 'string') return 30;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.floor(parsed);
}

/** Trailing `days` dates (oldest first) as "YYYY-MM-DD", ending today (UTC). */
function trailingDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date(nowSql().replace(' ', 'T') + 'Z');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function createAnalyticsRouter(): Router {
  const router = Router();

  router.get('/servings-per-day', (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const dates = trailingDates(days);

    const rows = db
      .prepare(
        `SELECT date(occurred_at) AS day, SUM(quantity) AS consumed
         FROM consumption_events
         WHERE date(occurred_at) >= date(?, ?)
         GROUP BY day`,
      )
      .all(nowSql(), `-${days - 1} days`) as { day: string; consumed: number }[];

    const byDay = new Map(rows.map((row) => [row.day, row.consumed]));
    res.json(dates.map((date) => ({ date, consumed: byDay.get(date) ?? 0 })));
  });

  router.get('/age-per-day', (req: Request, res: Response) => {
    const days = parseDays(req.query.days);
    const dates = trailingDates(days);

    const rows = db
      .prepare(
        `SELECT date(occurred_at) AS day,
                SUM(age_days * quantity) AS weightedAge,
                SUM(quantity) AS totalQuantity
         FROM consumption_events
         WHERE date(occurred_at) >= date(?, ?)
         GROUP BY day`,
      )
      .all(nowSql(), `-${days - 1} days`) as {
      day: string;
      weightedAge: number;
      totalQuantity: number;
    }[];

    const byDay = new Map(rows.map((row) => [row.day, row]));
    res.json(
      dates.map((date) => {
        const row = byDay.get(date);
        const avgAgeDays = row && row.totalQuantity > 0 ? row.weightedAge / row.totalQuantity : null;
        return { date, avgAgeDays };
      }),
    );
  });

  router.get('/insights', (_req: Request, res: Response) => {
    const now = nowSql();
    const items = db.prepare('SELECT * FROM items').all() as Omit<Item, 'tags'>[];
    const tagsByItem = getTagsForItems(items.map((item) => item.id));

    const avgDailyConsumptionByItem = new Map(
      (
        db
          .prepare(
            `SELECT item_id AS itemId, SUM(quantity) / 7.0 AS avgDaily
             FROM consumption_events
             WHERE occurred_at >= datetime(?, '-7 days')
             GROUP BY item_id`,
          )
          .all(now) as { itemId: number; avgDaily: number }[]
      ).map((row) => [row.itemId, row.avgDaily]),
    );

    const restockInsights: {
      type: 'restock';
      itemId: number;
      itemName: string;
      servings: number;
      daysUntilEmpty: number;
      message: string;
    }[] = [];

    const agingInsights: {
      type: 'aging';
      itemId: number;
      itemName: string;
      servings: number;
      ageDays: number;
      message: string;
    }[] = [];

    for (const item of items) {
      const avgDaily = avgDailyConsumptionByItem.get(item.id);
      if (avgDaily && avgDaily > 0) {
        const daysUntilEmpty = item.servings / avgDaily;
        if (daysUntilEmpty <= 3) {
          restockInsights.push({
            type: 'restock',
            itemId: item.id,
            itemName: item.name,
            servings: item.servings,
            daysUntilEmpty,
            message: `It's time to restock ${item.name}, it's going fast this week!`,
          });
        }
      }

      if (item.servings > 0) {
        const tags = tagsByItem.get(item.id) ?? [];
        const isFreezer = tags.some((tag) => tag.toLowerCase() === 'freezer');
        const threshold = isFreezer ? 90 : 7;
        const ageDays = getOldestBatchAgeDays(item.id, now);
        if (ageDays !== null && ageDays >= threshold) {
          agingInsights.push({
            type: 'aging',
            itemId: item.id,
            itemName: item.name,
            servings: item.servings,
            ageDays,
            message: `${item.name} has been sitting for ${ageDays} days — use it soon`,
          });
        }
      }
    }

    restockInsights.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
    agingInsights.sort((a, b) => b.ageDays - a.ageDays);

    res.json([...restockInsights, ...agingInsights]);
  });

  return router;
}
