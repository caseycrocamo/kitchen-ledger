import { Router, type Request, type Response } from 'express';

import { asyncHandler } from '../asyncHandler';
import pool from '../db';
import { getOldestBatchAgeDays } from '../servingBatches';
import { getTagsForItems } from '../tags';
import type { Item } from '../types';

function parseDays(raw: unknown): number {
  if (typeof raw !== 'string') return 30;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.floor(parsed);
}

/** Trailing `days` dates (oldest first) as "YYYY-MM-DD", ending today (UTC). */
function trailingDates(days: number, now: Date): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Charts show at most this many items by name; the rest fold into an "Other" series. */
const TOP_ITEM_LIMIT = 7;

interface DailyItemRow {
  day: string;
  itemId: number;
  itemName: string;
  quantity: number;
  weightedAge: number;
}

/** One row per (day, item) with consumption for that day in the trailing window. */
async function getDailyItemRows(days: number, now: Date): Promise<DailyItemRow[]> {
  const since = trailingDates(days, now)[0];
  const { rows } = await pool.query<DailyItemRow>(
    `SELECT to_char(consumption_events.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
            consumption_events.item_id AS "itemId",
            items.name AS "itemName",
            SUM(consumption_events.quantity)::int AS quantity,
            SUM(consumption_events.age_days * consumption_events.quantity)::int AS "weightedAge"
     FROM consumption_events
     JOIN items ON items.id = consumption_events.item_id
     WHERE (consumption_events.occurred_at AT TIME ZONE 'UTC')::date >= $1::date
     GROUP BY day, consumption_events.item_id, items.name`,
    [since],
  );
  return rows;
}

/** Items ranked by total quantity consumed across the window, highest first. */
function rankItems(rows: DailyItemRow[]): { itemId: number; itemName: string }[] {
  const totals = new Map<number, { itemName: string; total: number }>();
  for (const row of rows) {
    const entry = totals.get(row.itemId);
    if (entry) entry.total += row.quantity;
    else totals.set(row.itemId, { itemName: row.itemName, total: row.quantity });
  }
  return [...totals.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[1].itemName.localeCompare(b[1].itemName))
    .map(([itemId, v]) => ({ itemId, itemName: v.itemName }));
}

/** Splits ranked items into the tracked (named) set and an "Other" catch-all id set, if needed. */
function trackedItemsFor(
  ranked: { itemId: number; itemName: string }[],
): { tracked: { itemId: number | null; itemName: string }[]; otherIds: Set<number> } {
  const topItems = ranked.slice(0, TOP_ITEM_LIMIT);
  const otherIds = new Set(ranked.slice(TOP_ITEM_LIMIT).map((item) => item.itemId));
  const tracked: { itemId: number | null; itemName: string }[] =
    otherIds.size > 0 ? [...topItems, { itemId: null, itemName: 'Other' }] : topItems;
  return { tracked, otherIds };
}

export function createAnalyticsRouter(): Router {
  const router = Router();

  router.get(
    '/servings-per-day',
    asyncHandler(async (req: Request, res: Response) => {
      const days = parseDays(req.query.days);
      const now = new Date();
      const dates = trailingDates(days, now);

      const rows = await getDailyItemRows(days, now);
      const { tracked, otherIds } = trackedItemsFor(rankItems(rows));

      const byDayItem = new Map<string, Map<number, number>>();
      for (const row of rows) {
        if (!byDayItem.has(row.day)) byDayItem.set(row.day, new Map());
        byDayItem.get(row.day)!.set(row.itemId, row.quantity);
      }

      res.json(
        dates.map((date) => ({
          date,
          items: tracked.map((item) => {
            if (item.itemId === null) {
              const dayMap = byDayItem.get(date);
              let quantity = 0;
              if (dayMap) for (const id of otherIds) quantity += dayMap.get(id) ?? 0;
              return { itemId: null, itemName: 'Other', quantity };
            }
            return {
              itemId: item.itemId,
              itemName: item.itemName,
              quantity: byDayItem.get(date)?.get(item.itemId) ?? 0,
            };
          }),
        })),
      );
    }),
  );

  router.get(
    '/age-per-day',
    asyncHandler(async (req: Request, res: Response) => {
      const days = parseDays(req.query.days);
      const now = new Date();
      const dates = trailingDates(days, now);

      const rows = await getDailyItemRows(days, now);
      const { tracked, otherIds } = trackedItemsFor(rankItems(rows));

      const byDayItem = new Map<string, Map<number, { quantity: number; weightedAge: number }>>();
      for (const row of rows) {
        if (!byDayItem.has(row.day)) byDayItem.set(row.day, new Map());
        byDayItem.get(row.day)!.set(row.itemId, { quantity: row.quantity, weightedAge: row.weightedAge });
      }

      res.json(
        dates.map((date) => ({
          date,
          items: tracked.map((item) => {
            if (item.itemId === null) {
              const dayMap = byDayItem.get(date);
              let quantity = 0;
              let weightedAge = 0;
              if (dayMap) {
                for (const id of otherIds) {
                  const entry = dayMap.get(id);
                  if (entry) {
                    quantity += entry.quantity;
                    weightedAge += entry.weightedAge;
                  }
                }
              }
              return { itemId: null, itemName: 'Other', avgAgeDays: quantity > 0 ? weightedAge / quantity : null };
            }
            const entry = byDayItem.get(date)?.get(item.itemId);
            return {
              itemId: item.itemId,
              itemName: item.itemName,
              avgAgeDays: entry && entry.quantity > 0 ? entry.weightedAge / entry.quantity : null,
            };
          }),
        })),
      );
    }),
  );

  router.get(
    '/insights',
    asyncHandler(async (_req: Request, res: Response) => {
      const now = new Date();
      const { rows: items } = await pool.query<Omit<Item, 'tags'>>('SELECT * FROM items');
      const tagsByItem = await getTagsForItems(items.map((item) => item.id));

      const { rows: avgRows } = await pool.query<{ itemId: number; avgDaily: number }>(
        `SELECT item_id AS "itemId", (SUM(quantity)::float / 7.0) AS "avgDaily"
         FROM consumption_events
         WHERE occurred_at >= $1::timestamptz - interval '7 days'
         GROUP BY item_id`,
        [now],
      );
      const avgDailyConsumptionByItem = new Map(avgRows.map((row) => [row.itemId, Number(row.avgDaily)]));

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
          const ageDays = await getOldestBatchAgeDays(item.id, now);
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
    }),
  );

  return router;
}
