# Collapse Category/Location into Free-Form Tags

## TL;DR

Replace the two fixed-enum columns `items.category` (`'main' | 'side'`) and `items.location` (`'fridge' | 'freezer'`) with a single, open-ended `tags: string[]` per item — people can keep using "main"/"side"/"fridge"/"freezer" as tags, or invent their own ("leftovers", "meal-prep", "kids-lunch"). This touches the data model, both item-mutating endpoints, the read path, and every piece of UI that currently branches on category/location: the create/edit form's two `<select>`s, the Toolbar's two filter button-groups, the two sort options, and the two badges on the expanded item card.

Because tags are now open-ended, they need a real many-to-many structure — `tags` (id, name) and a join table `item_tags` (item_id, tag_id) — rather than a fixed 4-value lookup. Existing `category`/`location` data is migrated into tags once, then those columns are dropped from `items` entirely (SQLite's `ALTER TABLE ... DROP COLUMN`, supported by the SQLite version `better-sqlite3` v12 bundles). The app has no migration framework — this plan extends its existing "`CREATE TABLE IF NOT EXISTS` is the migration story" approach with one conditional, self-disabling block: it only runs the category/location → tags backfill (and the column drop) while those columns still exist, so it's a no-op on every boot after the first.

**Depends on / interacts with** [plans/analytics-dashboard.md](analytics-dashboard.md): that plan's "aging" insight currently branches on `item.location === 'freezer'` to pick a staleness threshold. Once `location` no longer exists, it needs a tag-based fallback instead (see Decisions there and here). If both plans ship, land this one first — the analytics plan's insight code should be written against `item.tags`, not `item.location`, from the start.

## Steps

### Phase 1 — Backend: schema migration

1. In [server/src/db.ts](server/src/db.ts:21), add `CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE)` (case-insensitive uniqueness so "Fridge" and "fridge" can't both exist) and `CREATE TABLE IF NOT EXISTS item_tags (item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (item_id, tag_id))`. Requires the `foreign_keys = ON` pragma (add it if not already added by the analytics plan).
2. Immediately after, add a one-time migration block: check `PRAGMA table_info(items)` for a `category` or `location` column. If present, inside a `db.transaction()`: for every existing item, insert (or ignore, if already present from a prior partial run) a tag row for its `category` value and one for its `location` value, then link both to the item via `item_tags`. After all items are migrated, run `ALTER TABLE items DROP COLUMN category` and `ALTER TABLE items DROP COLUMN location`. Because the check is "do these columns still exist," this whole block becomes a no-op on every subsequent boot — same idempotency guarantee as the existing `IF NOT EXISTS` statements, just gated on column presence instead.
3. Update [server/src/types.ts](server/src/types.ts) and [src/types.ts](src/types.ts): remove `Category`/`Location`; `Item` drops `category`/`location` and gains `tags: string[]`.

### Phase 2 — Backend: tag read/write logic

4. Add `server/src/tags.ts` (mirrors the separation already used for `servingBatches.ts` in the analytics plan): 
   - `findOrCreateTagIds(names: string[]): number[]` — trims, drops empties, dedupes case-insensitively, then for each name does `INSERT OR IGNORE INTO tags (name) VALUES (?)` followed by a lookup (`SELECT id FROM tags WHERE name = ? COLLATE NOCASE`).
   - `setItemTags(itemId: number, names: string[])` — resolves tag ids via the above, deletes all existing `item_tags` rows for `itemId`, inserts the new set, then prunes orphans (`DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)`) so removed/renamed tags don't linger forever in the tag list.
   - `getTagsForItems(itemIds: number[]): Map<number, string[]>` — one query (`... WHERE item_id IN (...)`) batching tag lookups for a list of items, avoiding N+1 queries in `GET /api/items`.
5. Add a `parseTags(raw: unknown): string[] | null` validator in [server/src/routes/items.ts](server/src/routes/items.ts), next to the existing `isCategory`/`isLocation`/`parseServings` validators (items.ts:13-27): tags arrive as a JSON-encoded array inside the multipart `FormData` body (the existing `POST`/`PATCH` handlers are `upload.single('image')` routes, so plain nested JSON isn't available — same reason `servings` is sent as a string today). Reject if not valid JSON, not an array, or containing non-string/empty entries after trimming.

### Phase 3 — Backend: wire into items routes

6. [server/src/routes/items.ts](server/src/routes/items.ts) `POST /` (items.ts:59): replace the `category`/`location` validation with `parseTags(req.body.tags)`; require at least one tag (mirrors today's requirement that category and location were both mandatory). On success, insert the item (without category/location columns), then call `setItemTags(newId, tags)` in the same transaction.
7. `PATCH /:id` (items.ts:98): when `body.tags !== undefined`, validate via `parseTags` and call `setItemTags(id, tags)` instead of the current `category`/`location` column updates.
8. `GET /` and `getItemById` (items.ts:47, 54): drop `category`/`location` from the `SELECT`, fetch tags via `getTagsForItems` for the returned id(s), and attach `tags: string[]` to each row before responding.
9. Add `server/src/routes/tags.ts`: `GET /` returns `[{ id, name, itemCount }]` (`LEFT JOIN item_tags ... GROUP BY tags.id`, ordered by name) — powers both the Toolbar's tag filter and the new tag-input's autocomplete. Mount at `/api/tags` in [server/src/index.ts](server/src/index.ts:42).

### Phase 4 — Frontend: data layer

10. [src/api.ts](src/api.ts): `ItemInput`/`ItemUpdateInput` drop `category`/`location`, gain `tags: string[]`; `toFormData` (api.ts:47) does `formData.set('tags', JSON.stringify(input.tags))`. Add `fetchTags(): Promise<{ id: number; name: string; itemCount: number }[]>`.
11. [src/state.ts](src/state.ts): add `allTags = signal<string[]>([])` plus a `loadTags()` loader (called alongside `loadItems()` from `App.tsx`'s existing mount effect). Replace `categoryFilter`/`locationFilter` with `tagFilter = signal<string[]>([])`. Update `visibleItems`'s filter (state.ts:34-39) to `tagFilter.value.every(t => item.tags.some(it => it.toLowerCase() === t.toLowerCase()))` when `tagFilter.value.length > 0` (AND semantics — see Decisions). Drop the `'category'`/`'location'` branches from the `SortOption` union and the `sortBy` switch (state.ts:54-59) — a multi-valued field has no single natural sort key.

### Phase 5 — Frontend: tag input component

12. Add `src/components/TagInput.tsx`: a chip-style multi-value input taking `value: string[]`, `onChange: (tags: string[]) => void`, and `suggestions: string[]`. Renders existing tags as removable chips (× button per chip) followed by a text `<input>`; Enter or comma commits the trimmed current text as a new chip (case-insensitive dedupe against existing chips) and clears the input; Backspace on an empty input removes the last chip; typing filters `suggestions` (excluding already-added tags) into a small dropdown below the input, and clicking a suggestion adds it as a chip. This is the single largest net-new piece of UI in this change — everything else is swapping existing controls for equivalent tag-aware ones.

### Phase 6 — Frontend: wire into existing UI

13. [src/components/ItemFormModal.tsx](src/components/ItemFormModal.tsx): replace the `category`/`location` `<select>` pair (lines 128-192) with one `TagInput`, seeded from `item?.tags ?? []`, `suggestions={allTags.value}`. Submit `tags` instead of `category`/`location` in both the `createItem` and `updateItem` calls (lines 74-90).
14. [src/components/Toolbar.tsx](src/components/Toolbar.tsx): replace the `CATEGORY_OPTIONS`/`LOCATION_OPTIONS` segmented button groups (lines 78-102) with one dynamically-generated multi-select tag filter, built from `allTags.value` using the same `segmentClass` toggle-button styling, writing to `tagFilter`. Update `activeFilterCount` (Toolbar.tsx:34-35) to `tagFilter.value.length`. Drop `category`/`location` from `SORT_OPTIONS` (Toolbar.tsx:5-11).
15. [src/components/ItemCard.tsx](src/components/ItemCard.tsx): replace the two fixed `CATEGORY_LABEL`/`LOCATION_LABEL` badges (lines 182-188) with `item.tags.map(tag => <span class="...badge...">{tag}</span>)`, keeping the same badge visual style (rotate through a small fixed palette by tag name hash, or keep it a single neutral color — see Decisions).

### Phase 7 — Verification pass

16. Run `npm run build` in both the repo root and `server/`.
17. Start the server against the existing dev DB; confirm the migration runs once (`category`/`location` columns gone, every pre-existing item shows up with exactly the two tags it had before, e.g. an item that was `category: main, location: freezer` now has tags `["main", "freezer"]`), and restarting again is a silent no-op.
18. In the browser: create a new item with a brand-new tag name (not one of the original 4); confirm it appears in the Toolbar's filter options and the `TagInput` autocomplete on the next item you add.
19. Edit an existing item's tags (add one, remove one); confirm the change persists and that a tag which is now unused anywhere disappears from the filter/autocomplete (orphan pruning).
20. Exercise the Toolbar's tag filter with two tags selected; confirm only items containing both appear (AND semantics).
21. Confirm sorting no longer offers "Category"/"Location" and the remaining sort options still work.
22. Confirm the `TagInput`'s keyboard interactions (Enter/comma to add, Backspace to remove last, click-suggestion to add) and that duplicate/empty tags can't be added.

## Relevant Files

**Backend**
- [server/src/db.ts](server/src/db.ts) — add `tags`/`item_tags` tables, `foreign_keys` pragma, one-time category/location → tags migration + column drop.
- `server/src/tags.ts` (new) — find-or-create, set-tags-for-item, batch tag lookup, orphan pruning.
- [server/src/routes/items.ts](server/src/routes/items.ts) — swap category/location validation and columns for `parseTags`/`setItemTags` in create, update, and read paths.
- `server/src/routes/tags.ts` (new) — `GET /api/tags`.
- [server/src/index.ts](server/src/index.ts) — mount the tags router.
- [server/src/types.ts](server/src/types.ts) — drop `Category`/`Location`; `Item.tags: string[]`.

**Frontend**
- [src/types.ts](src/types.ts) — same `Item` shape change as the server.
- [src/api.ts](src/api.ts) — `tags` replaces `category`/`location` in item input types; add `fetchTags`.
- [src/state.ts](src/state.ts) — `allTags`/`loadTags`, `tagFilter` replaces `categoryFilter`/`locationFilter`, sort options trimmed.
- `src/components/TagInput.tsx` (new) — chip input + autocomplete.
- [src/components/ItemFormModal.tsx](src/components/ItemFormModal.tsx) — swap two selects for one `TagInput`.
- [src/components/Toolbar.tsx](src/components/Toolbar.tsx) — swap two segmented filters for one tag filter; trim sort options.
- [src/components/ItemCard.tsx](src/components/ItemCard.tsx) — swap two fixed badges for a `tags.map(...)` badge list.

## Verification

- `npm run build` (root) and `npm run build` (server/) both pass.
- Migration is confirmed one-way and idempotent per step 17 above (columns dropped, tags correctly seeded, safe to restart repeatedly).
- Manual browser pass covering tag creation, editing, filtering (AND semantics), autocomplete, orphan pruning, and sort-option removal (steps 18–22 above).
- Existing item add/edit/delete/servings flows still work end-to-end now that `category`/`location` are gone from the payloads.

## Decisions

- **Fully open tags, not a fixed 4-value set** — per explicit direction, this is a real many-to-many tag system (`tags` + `item_tags`), not just a cosmetic merge of the two existing dropdowns into one.
- **At least one tag required per item**, matching today's requirement that both category and location were mandatory — an item with zero tags would also break the aging-insight fallback in the analytics plan (see below).
- **Filter semantics are AND**, not OR: selecting multiple tags in the Toolbar narrows to items containing *all* of them (closest to how the previous two independent category+location filters behaved, both had to match simultaneously). Easy to flip to OR later if it feels wrong in practice.
- **No dedicated tag-management screen** (rename/delete a tag globally) — unused tags simply fall out of the list automatically via orphan pruning whenever the last item referencing them is retagged. A rename/merge UI is a reasonable fast-follow if stray near-duplicate tags become a real problem, not needed for v1.
- **Column drop via `ALTER TABLE ... DROP COLUMN`** — requires SQLite ≥ 3.35; `better-sqlite3` v12 bundles a modern enough SQLite for this to be safe. Flagging it since it's the one part of this migration that isn't purely additive like every other schema change in this codebase so far.
- **Badge coloring on the item card**: the old badges had fixed, meaningful colors (blue for category, teal for location). With open tags there's no fixed vocabulary to color by; simplest is one consistent neutral badge style for every tag rather than trying to auto-assign colors — revisit only if it reads as visually flat in practice.

## Further Considerations

- **Analytics-dashboard dependency:** if [plans/analytics-dashboard.md](analytics-dashboard.md) ships, its aging-insight threshold (fridge: 7 days vs. freezer: 90 days) needs to key off `item.tags.some(t => t.toLowerCase() === 'freezer')` instead of `item.location`, with the 7-day threshold as the default for anything not explicitly tagged "freezer." That plan's step should be updated to reflect this before implementation — noted there as well.
- **Tag normalization beyond case-insensitivity** (e.g. trimming plurals, "fridge" vs "fridges") is not handled — out of scope unless it turns out to matter in practice.
- **Autocomplete ranking:** `GET /api/tags` returns everything sorted alphabetically; ranking by `itemCount` (most-used first) in the `TagInput` dropdown could be a nice follow-up but isn't required for v1.
