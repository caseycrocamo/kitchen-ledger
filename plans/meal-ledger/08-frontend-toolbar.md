# Chunk 08 — Search, filter, sort toolbar

Corresponds to master plan Phase 7, steps 21–22.

**Depends on:** [06-frontend-item-cards.md](06-frontend-item-cards.md) (`ItemList` already
consuming `visibleItems`).

## Files

- `src/components/Toolbar.tsx` *(new)*
- `src/state.ts` *(modify)* — fill in the real filter/sort logic in `visibleItems` (chunk 05 left
  it as a pass-through).
- `src/App.tsx` *(modify)* — mount `Toolbar` above the card grid.

## Steps

1. Build `src/components/Toolbar.tsx`: a text search input bound to `searchQuery`; category and
   location filter controls (segmented buttons or selects) bound to their signals; a sort
   `<select>` bound to `sortBy` with options — Name (A–Z), Newest added, Servings (high→low),
   Category, Location.
2. Implement the actual filter/sort logic in `src/state.ts`'s `visibleItems` computed — not
   scattered across components: case-insensitive substring match on name; equality filters on
   category/location (`'all'` = no filter); comparator per `sortBy` value.
3. Mount `<Toolbar />` in `src/App.tsx` above `<ItemList />`.

## Verification

- Search by a partial, case-mismatched substring of an item name and confirm it still matches.
- Filter by each category/location value individually, and by `'all'` on both axes.
- Sort by every option and confirm the visible order actually changes (Name A–Z, Newest added,
  Servings high→low, Category, Location).
- Combine search + a filter + a sort simultaneously and confirm they compose correctly (not just
  each in isolation).

## Notes carried from the master plan

- **Client-side search/filter/sort** — the item list is expected to be small (a fridge/freezer's
  worth of meals), so filtering over the full `GET /api/items` payload in the browser is simpler
  than building query-param support into the API.
