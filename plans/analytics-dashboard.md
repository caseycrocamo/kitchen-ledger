# Analytics Dashboard Plan

## TL;DR

Add a second view — an analytics dashboard — reachable from a new hamburger menu in the header, showing servings consumed per day, the average age of consumed servings, and an **insights** section that flags items that need attention: **restock** insights ("it's time to restock X, it's going fast this week!") and **aging** insights ("X has been sitting for N days — use it soon"). The app currently has no history at all — `items.servings` is a live count with no timestamps behind it — so this is really three layers: (1) a backend data model that gives every serving a create date, (2) aggregation endpoints over that data, and (3) the dashboard UI.

**The core data-model change:** `items.servings` (an integer) can't tell you how old any given serving is, and it especially can't tell you that once restocks and consumption interleave (add 3, eat 1, add 2, eat 2 — which servings are left, and how old are they?). So instead of only logging *when servings changed*, track servings as **dated batches**:

- `serving_batches` — one row per restock/creation event: `(item_id, quantity, created_at)`. A batch's age is `now - created_at`.
- `consumption_events` — one row per **actual consumption** (the − button) *per batch it drew from*, recording how much was taken and how old that batch was: `(item_id, quantity, age_days, occurred_at)`.

Consuming N servings walks `serving_batches` for that item oldest-first (FIFO — real kitchens eat the oldest stock first) and decrements/deletes batches until N is accounted for, logging a `consumption_events` row for each batch it touched. `items.servings` stays exactly as it is today (still the fast, authoritative "current count" column, unchanged in every existing read path) — the batches table is purely additive and is always mutated in the same transaction as `items.servings`, so the two can never drift.

Manual servings edits (via the item edit form, not the +/− buttons) and initial servings set at item creation still adjust batches (so the age ledger stays accurate), but do **not** write `consumption_events` rows — they aren't consumption (see Decisions, carried over from the original plan).

Chart rendering uses `chart.js` (new dependency, canvas-based and framework-agnostic — no `preact/compat` needed). Navigation is a tiny hand-rolled pushState router, since the app has none today and only needs two pages.

Because there's no historical batch data to backfill, every existing item's current stock is treated as one batch created "now" the moment this ships (see Decisions) — ages start accumulating from launch, they aren't retroactively known.

## Steps

### Phase 1 — Backend: dated serving batches + consumption log

1. In [server/src/db.ts](server/src/db.ts:21), add two `CREATE TABLE IF NOT EXISTS` statements (same no-migration-framework pattern already used for `items`):
   - `serving_batches`: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE`, `quantity INTEGER NOT NULL CHECK (quantity > 0)`, `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`. Index on `(item_id, created_at)` (drives the FIFO walk and the "oldest batch" lookup).
   - `consumption_events`: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE`, `quantity INTEGER NOT NULL CHECK (quantity > 0)`, `age_days INTEGER NOT NULL`, `occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`. Index on `(occurred_at)` (drives the daily aggregations).
   - Add `db.pragma('foreign_keys = ON')` near the existing `journal_mode = WAL` pragma — `better-sqlite3` doesn't enforce `ON DELETE CASCADE` unless foreign keys are explicitly turned on, and it isn't today.
   - One-time backfill (runs harmlessly every startup since it's guarded): for any item with `servings > 0` that has zero rows in `serving_batches`, insert one batch of that item's current `servings`, `created_at = CURRENT_TIMESTAMP`. This covers both pre-existing items (launch-day migration) and stays a no-op afterward.

2. Add `server/src/servingBatches.ts`, a small internal module (kept out of `items.ts` so that file doesn't grow unbounded) exporting:
   - `addBatch(itemId, quantity, now)` — `INSERT INTO serving_batches`.
   - `removeFromBatches(itemId, quantity, now, { log }: { log: boolean })` — selects batches for the item ordered `created_at ASC, id ASC`, and for each one takes `min(batch.quantity, remaining)`: updates or deletes the batch, and — only when `log` is true — inserts a `consumption_events` row with that batch's `age_days = daysBetween(batch.created_at, now)` and the quantity taken from it. Continues until `remaining` reaches 0.
   - `getOldestBatchAgeDays(itemId, now)` — `MIN(created_at)` for the item's remaining batches, converted to days (used by the aging insight).
   - This module is the single place FIFO logic lives; both `items.ts` and the new `analytics.ts` route depend on it.

3. Update [server/src/routes/items.ts](server/src/routes/items.ts):
   - `POST /` (item creation, [items.ts:59](server/src/routes/items.ts:59)): after inserting the item, call `addBatch(newItemId, servings, now)` if `servings > 0`, in the same transaction as the insert.
   - `PATCH /:id/servings` ([items.ts:170](server/src/routes/items.ts:170)): wrap the existing `UPDATE items SET servings = ...` together with either `addBatch` (delta > 0) or `removeFromBatches(..., { log: true })` (delta < 0) in one `db.transaction()`.
   - `PATCH /:id` ([items.ts:98](server/src/routes/items.ts:98)), when `body.servings` is present and differs from the existing count: compute the diff and call `addBatch` (diff > 0) or `removeFromBatches(..., { log: false })` (diff < 0) in the same transaction as the update — keeps the batch ledger accurate for manual corrections without counting them as consumption.
   - `DELETE /:id`: no change needed — `ON DELETE CASCADE` (once foreign keys are on) removes the item's batches and consumption events automatically, same as it will for anything else keyed on `item_id`.

4. Add `ConsumptionEvent` and `ServingBatch` interfaces to [server/src/types.ts](server/src/types.ts), mirroring the existing `Item` interface style, if the analytics route needs typed row shapes.

### Phase 2 — Backend: analytics endpoints

5. Create `server/src/routes/analytics.ts`, following the `createItemsRouter(upload)` factory pattern in [items.ts:51](server/src/routes/items.ts:51):
   - `GET /servings-per-day?days=30` — `SUM(quantity)` from `consumption_events` grouped by `date(occurred_at)` over the trailing N days, returned as a **dense** array (one entry per day, zero-filled for days with no rows — don't return sparse SQL results and push gap-filling onto the frontend).
   - `GET /age-per-day?days=30` — weighted average age of consumption per day: `SUM(age_days * quantity) / SUM(quantity)` from `consumption_events`, grouped by `date(occurred_at)`, dense-filled like above but with `avgAgeDays: number | null` (null, not 0, on days with no consumption — 0 would misleadingly imply "everything eaten was brand new").
   - `GET /insights` — two insight types, computed per item and merged into one sorted list:
     - **restock**: trailing-7-day average daily consumption (`SUM(quantity)` from `consumption_events` in the last 7 days, ÷ 7). Skip items with none. Flag when `item.servings / avgDailyConsumption <= 3`.
     - **aging**: `getOldestBatchAgeDays(itemId, now)` compared against a threshold of 90 days if the item has a tag literally named "freezer" (case-insensitive), else 7 days (freezer stock keeps far longer; see Decisions — this now keys off `item.tags`, not a `location` column, per [plans/item-tags.md](item-tags.md)). Skip items with 0 servings.
     - Both types return `{ type, itemId, itemName, servings, message }` plus a type-specific urgency field (`daysUntilEmpty` for restock, `ageDays` for aging); sort restock by `daysUntilEmpty` ascending and aging by `ageDays` descending, then interleave or just concatenate restock-first (restock is the more time-critical of the two — see Decisions).

6. Mount the new router in [server/src/index.ts](server/src/index.ts:42): `app.use('/api/analytics', createAnalyticsRouter())`.

### Phase 3 — Frontend: data layer

7. Add to [src/types.ts](src/types.ts): `ServingsPerDay { date: string; consumed: number }`, `AgePerDay { date: string; avgAgeDays: number | null }`, and a discriminated `Insight` union — `{ type: 'restock'; itemId: number; itemName: string; servings: number; daysUntilEmpty: number; message: string } | { type: 'aging'; itemId: number; itemName: string; servings: number; ageDays: number; message: string }`.
8. Add `fetchServingsPerDay(days?)`, `fetchAgePerDay(days?)`, `fetchInsights()` to [src/api.ts](src/api.ts), following the existing `request<T>()` wrapper (src/api.ts:58).
9. Add `src/dashboardState.ts` (kept separate from [src/state.ts](src/state.ts)): signals for `servingsPerDay`, `agePerDay`, `insights`, `dashboardLoading`, `dashboardError`, and a `loadDashboard()` function mirroring `loadItems()`'s try/catch/finally shape (src/state.ts:16), fetching all three endpoints (e.g. via `Promise.all`).

### Phase 4 — Frontend: navigation (hamburger + dashboard link)

10. Add `src/router.ts`: a `currentPath` signal seeded from `window.location.pathname`, a `navigate(path)` that calls `history.pushState` and updates the signal, and a `popstate` listener to keep it in sync with browser back/forward. Not a library — the app has none today and only needs two paths (`/`, `/dashboard`).
11. Add `src/components/HeaderMenu.tsx`: hamburger icon button (☰, matching the inline-SVG-icon style in [Toolbar.tsx:60](src/components/Toolbar.tsx:60)) toggling a dropdown via local `useState` (same pattern as `Toolbar`'s `filtersOpen`), with one "Dashboard" entry calling `navigate('/dashboard')`. Close on outside click (backdrop `<div>`, same style as [ConfirmModal.tsx:53](src/components/ConfirmModal.tsx:53)) and on Escape.
12. Extract the current item-list body of [App.tsx:31-34](src/App.tsx:31) (`<Toolbar /><ItemList .../>`, the `modal` state, and `ItemFormModal`) into `src/components/ItemsPage.tsx` — a pure move, no behavior change.
13. Rewrite [src/App.tsx](src/App.tsx) as a thin shell: header with title + `HeaderMenu` (swap to a back-arrow when `currentPath.value === '/dashboard'`), then `<ItemsPage />` or `<DashboardPage />` based on `currentPath.value`. Move the "+ Add item" button into `ItemsPage.tsx` (meaningless on the dashboard).

### Phase 5 — Frontend: dashboard UI

14. Add `chart.js` to [package.json](package.json) dependencies.
15. Add `src/components/ServingsChart.tsx`: canvas-ref wrapper instantiating a `Chart` (bar type) over `servingsPerDay` in a `useEffect`, destroying the previous instance before creating a new one and on unmount.
16. Add `src/components/AgeChart.tsx`: same wrapper shape as `ServingsChart`, line-chart type over `agePerDay`, gaps (null values) left as gaps rather than dropped to zero.
17. Add `src/components/InsightsList.tsx`: renders one card per `Insight`, styled/labeled by `type` (e.g. a restock icon vs. an aging/clock icon, distinct accent color), with an empty state ("No alerts right now — you're all stocked up and everything's fresh!") mirroring [ItemList.tsx:51-65](src/components/ItemList.tsx:51).
18. Add `src/components/DashboardPage.tsx`: calls `loadDashboard()` on mount, composes "Servings consumed per day" (`ServingsChart`), "Average age of servings eaten" (`AgeChart`), and "Insights" (`InsightsList`) sections, with loading-skeleton/error-with-retry states matching [ItemList.tsx:25-49](src/components/ItemList.tsx:25).

### Phase 6 — Verification pass

19. Run `npm run build` in both the repo root and `server/`.
20. Start both dev servers; confirm the launch-day backfill runs cleanly against the existing dev DB (every current item ends up with one `serving_batches` row equal to its `servings` count).
21. Click the hamburger, confirm open/close (outside-click + Escape); navigate to `/dashboard`, confirm back/forward work.
22. Restock an item (+ button) — confirm a new batch is created "now." Consume from it (− button) repeatedly — confirm `consumption_events` rows appear with `age_days` near 0 (freshly restocked). For an item with older stock (or by directly editing a batch's `created_at` in the dev DB for testing), confirm consuming logs a larger `age_days`.
23. Re-open the dashboard; confirm the consumption chart's "today" bar and the age chart's "today" point both reflect the activity just generated.
24. Drive one item's servings down until it should cross the restock threshold; confirm a restock insight appears and later clears once restocked. Separately, backdate a batch (dev DB) past the fridge/freezer aging threshold for another item; confirm an aging insight appears.
25. Check empty states (fresh DB / no recent activity): zero-filled chart days, null-gapped age chart, "all stocked up and fresh" insights message — no blank space or errors.
26. Resize to a mobile viewport (`resize_window` preset `mobile`); confirm the dashboard, hamburger, and both charts remain usable.

## Relevant Files

**Backend**
- [server/src/db.ts](server/src/db.ts) — add `serving_batches` + `consumption_events` tables/indexes, `foreign_keys` pragma, launch-day backfill.
- `server/src/servingBatches.ts` (new) — FIFO batch add/remove + oldest-age helper, shared by routes.
- [server/src/routes/items.ts](server/src/routes/items.ts) — wire batch add/remove into create, `/:id/servings`, and manual `/:id` edits.
- [server/src/routes/analytics.ts](server/src/routes/analytics.ts) (new) — `servings-per-day`, `age-per-day`, `insights`.
- [server/src/index.ts](server/src/index.ts:42) — mount the analytics router.
- [server/src/types.ts](server/src/types.ts) — add `ServingBatch`, `ConsumptionEvent`.

**Frontend**
- [src/types.ts](src/types.ts) — add `ServingsPerDay`, `AgePerDay`, `Insight` (discriminated union).
- [src/api.ts](src/api.ts) — add `fetchServingsPerDay`, `fetchAgePerDay`, `fetchInsights`.
- `src/dashboardState.ts` (new) — dashboard signals + loader.
- `src/router.ts` (new) — minimal pushState router.
- `src/components/HeaderMenu.tsx` (new) — hamburger + dropdown.
- `src/components/ItemsPage.tsx` (new) — extracted current `App.tsx` body.
- `src/components/DashboardPage.tsx` (new) — dashboard composition + loading/error states.
- `src/components/ServingsChart.tsx` (new) — consumption-per-day bar chart.
- `src/components/AgeChart.tsx` (new) — average-age-per-day line chart.
- `src/components/InsightsList.tsx` (new) — two-type insight cards + empty state.
- [src/App.tsx](src/App.tsx) — becomes a thin shell: header + hamburger + route switch.
- [package.json](package.json) — add `chart.js`.

Reference points: [Toolbar.tsx](src/components/Toolbar.tsx) (collapsible section + local toggle), [ConfirmModal.tsx](src/components/ConfirmModal.tsx) (backdrop/Escape handling), [ItemList.tsx](src/components/ItemList.tsx) (loading/error/empty shape), [state.ts](src/state.ts) (signal + loader shape).

## Verification

- `npm run build` (root) and `npm run build` (server/) both pass.
- Fresh dev DB: `curl localhost:3001/api/analytics/servings-per-day?days=30`, `.../age-per-day?days=30`, `.../insights` all return sane empty/zero-filled shapes.
- After generating restock + consumption activity: the same three endpoints reflect it, `age_days` values look right relative to when the consumed batch was created.
- Restarting the server against a DB with pre-existing items (from before this change) shows the backfill created exactly one batch per item, matching `items.servings`.
- Manual browser pass covering hamburger open/close, dashboard navigation + back/forward, both charts rendering, both insight types appearing/clearing, and mobile viewport layout (steps 21–26 above).
- Confirm existing item-list functionality (add/edit/delete/filter/sort/servings +/−) is unaffected by the `App.tsx` extraction and by the new batch bookkeeping riding along inside the same transactions.

## Decisions

- **Servings become dated batches, not a single timestamp on `items`.** A single `items.serving_created_at` column couldn't represent partially-aged stock (e.g. 3 old servings + 2 just restocked) — batches are the minimum model that makes "age" well-defined once restocks and consumption interleave.
- **`items.servings` is untouched as the authoritative live count**; `serving_batches`/`consumption_events` are purely additive and always mutated inside the same transaction as `items.servings`, so there's one invariant to maintain (`sum(serving_batches.quantity) == items.servings` per item) and no dual-write race.
- **FIFO consumption** (oldest batch first) — matches how people actually rotate kitchen stock, and gives every consumption event an unambiguous age.
- **What counts as consumption, reused from the original plan:** only the `/:id/servings` decrement path logs `consumption_events` (and thus feeds both the count and age charts). Manual edits via the item form and initial creation adjust batches for accuracy but are excluded from those charts.
- **No historical backfill of ages:** every pre-existing item's current stock becomes one batch dated "now" the moment this ships — the app has no way to know how old that stock actually was before tracking existed. Ages only become meaningful going forward.
- **Aging thresholds differ by a "freezer" tag** (90 days if present, 7 days otherwise — see [plans/item-tags.md](item-tags.md), which replaces the old fixed `location` column with open-ended tags) since freezer stock genuinely keeps longer — starting defaults, easy to retune once real usage data exists, same spirit as the restock heuristic's 7-day/3-day defaults. This is a soft convention, not a schema constraint: nothing requires an item to have a "freezer" tag, so untagged-for-location items just get the more conservative 7-day threshold.
- **Restock insights sort ahead of aging insights** when both exist, since running out is more time-critical than food slowly aging; both render in one list distinguished by an icon/color rather than two separate sections, to avoid the dashboard feeling like two disconnected widgets.
- **Routing/charting choices** (hand-rolled pushState router, `chart.js`) carried over unchanged from the original plan — see prior rationale.

## Further Considerations

- **Quick-action from insights:** letting a card restock or "use now" directly (open the edit modal, a `+N` button) instead of only linking back to the item list. Recommend as a fast-follow, not v1.
- **Configurable chart window:** fixed 30-day window for v1; a 7/30/90-day toggle could follow later.
- **Batch merging:** same-day restocks always create a new batch row rather than merging into an existing same-day one. Simpler and correct; at this app's scale the extra rows are irrelevant.
- **Event/batch volume:** not a concern at the app's current single-user local-SQLite scale; revisit only if that changes.
- **Per-item age detail:** the dashboard's age chart is store-wide (averaged across all items/day). A per-item "oldest serving" indicator on the item list itself (not just the dashboard) could be a nice follow-up but is out of scope here.
