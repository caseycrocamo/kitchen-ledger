# Chunk 06 — Item cards & home list

Corresponds to master plan Phase 5, steps 17–18.

**Depends on:** [05-frontend-shell-state.md](05-frontend-shell-state.md) (`items`/`visibleItems`
signals, `App.tsx` shell).

## Files

- `src/components/ItemCard.tsx` *(new)*
- `src/components/ItemList.tsx` *(new)*
- `src/App.tsx` *(modify)* — mount `ItemList` in place of the chunk 05 placeholder.

## Steps

1. Build `src/components/ItemCard.tsx`: image (or a placeholder icon/initials block when
   `image_filename` is null), name, a category badge (Main/Side), a location badge
   (Fridge/Freezer), a servings counter with `–`/`+` buttons — optimistic update via the `items`
   signal, calls `updateServings` from `src/api.ts`, rolls back on request failure. Edit/delete
   icon buttons render here but are wired up in chunks 07 and 09 respectively.
2. Build `src/components/ItemList.tsx`: renders `visibleItems` as a responsive card grid
   (Tailwind grid, e.g. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`); empty-state message when
   the list (or filtered result) is empty; loading skeleton during initial fetch; error banner
   with a retry button on fetch failure.
3. Update `src/App.tsx` to render `<ItemList />` instead of the chunk 05 placeholder text.

## Verification

- Seed a few rows directly against the chunk 03 API (`curl`/Postman) — with and without images.
- Confirm cards render correctly for both cases (placeholder block shows when no image).
- Confirm the servings `+`/`–` buttons update the count optimistically and that a page reload
  shows the persisted value (proves it round-tripped through `updateServings`, not just local
  state).
- Force a backend outage (stop the server) and confirm the error banner + retry button appear
  instead of a blank/crashed page.
- Confirm the empty-state message appears against a freshly-emptied `items` table.

## Notes carried from the master plan

- **Multiple photos per item** not requested — one optional image per item. Flag to the user if
  this needs to expand later (would need a child `images` table).
