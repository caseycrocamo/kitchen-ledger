# Chunk 08 — Completion summary

## What was built (this chunk's actual files)

- `src/components/Toolbar.tsx` — search input bound to `searchQuery`; segmented-button filters
  for category (`all`/`main`/`side`) and location (`all`/`fridge`/`freezer`) bound to
  `categoryFilter`/`locationFilter`; a sort `<select>` bound to `sortBy` with the five specified
  options (Name A–Z, Newest added, Servings high→low, Category, Location).
- `src/state.ts` — real filter/sort logic in the `visibleItems` computed:
  - case-insensitive substring match on `name` (`toLowerCase().includes(...)`)
  - equality filters on `category`/`location`, `'all'` = no filter
  - a comparator per `sortBy`: name (`localeCompare`, base sensitivity), newest
    (`created_at` string descending — the `"YYYY-MM-DD HH:MM:SS"` format sorts correctly
    lexically), servings (numeric descending), category/location (`localeCompare` ascending)
  - filter runs before sort; sort clones the filtered array before `.sort()` (no in-place
    mutation of `items.value`)
- `src/App.tsx` — mounts `<Toolbar />` above `<ItemList />`.

## Stand-ins built to make Toolbar real (not gold-plated — kept to what's needed for a
   working `visibleItems`)

Per chunk 01:
- `package.json` — added `preact`, `@preact/signals` deps; `@preact/preset-vite` devDep.
- `vite.config.ts` (new) — preact plugin + `/api` → `http://localhost:3001` proxy.
- `tsconfig.json` — added `jsx: "react-jsx"`, `jsxImportSource: "preact"`.

Per chunk 02 (frontend half only — `server/` is chunk 02/03's scope, not touched here):
- `src/types.ts` (new) — `Item`/`Category`/`Location` types, matching the spec's field list.

Per chunk 05:
- `src/state.ts` (new) — `items`, `loading`, `error` signals; `loadItems()` fetch wrapper;
  `searchQuery`/`categoryFilter`/`locationFilter`/`sortBy` signals (the `visibleItems` computed
  itself is this chunk's real deliverable, not a stand-in).
- `src/api.ts` (new) — `fetchItems`/`createItem`/`updateItem`/`updateServings`/`deleteItem`
  against `/api/...`, FormData for multipart writes, JSON for the servings delta.
- `src/main.ts` (modified) — Preact root render. Kept the `.ts` extension (spec says "modify",
  not rename) so JSX isn't usable here — used `h(App, {})` instead of a `<App />` literal.
- `src/App.tsx` (new, expanded beyond the chunk 05 placeholder since chunk 06/08 both need a
  real shell) — calls `loadItems()` on mount, renders header + `Toolbar` + `ItemList`.

Per chunk 06 (needed because `ItemList` is Toolbar's stated dependency: "`ItemList` already
consuming `visibleItems`"):
- `src/components/ItemCard.tsx` (new) — image or initials placeholder, category/location
  badges, servings counter with optimistic update + rollback via `updateServings`, inert
  edit/delete icon buttons (no-op; wired up in chunks 07/09 per that chunk's own notes).
- `src/components/ItemList.tsx` (new) — renders `visibleItems` as a responsive grid; loading
  skeleton, error banner + retry (calls `loadItems()`), and empty-state (distinguishes "no
  items at all" vs "no items match the filters").

Not built (genuinely out of scope for this chunk, and other agents own it in parallel):
`server/` (chunks 02–04), the add/edit modal (chunk 07), delete confirm flow (chunk 09).

## Deviations from the plan text

- `src/main.ts` was kept as `.ts` and uses the `h()` pragma instead of a JSX `<App />` literal,
  since esbuild/Vite only parses JSX in `.tsx`/`.jsx` files. The plan's file list says "modify"
  (not rename), so this preserves that while still achieving "a Preact root render."
- `src/App.tsx` ended up slightly fuller than chunk 05's own minimal spec (header markup, mounts
  Toolbar/ItemList directly) since this chunk needs a working end-to-end shell, not a
  "Loading…" placeholder — later agents building chunks 05–07 may reconcile/overwrite this.

## Verification

Per this chunk's own Verification section:

- `npm install` — succeeds (107 packages).
- `npx tsc --noEmit` — clean, no errors.
- `npm run build` (`tsc && vite build`) — succeeds.
- `npm run dev` — boots and serves `200` on `/`.
- Headless logic verification (no backend available in this worktree, so `visibleItems` was
  exercised directly by driving the signals with in-memory mock data via `tsx`, then deleted —
  not part of the committed diff): 15/15 checks passed, covering:
  - Search by a partial, case-mismatched substring (`"CHICK"` matches `"Chicken Tikka Masala"`
    and `"chicken noodle soup"`) — pass.
  - Category filter for `main`, `side`, and `all` — pass (3 checks).
  - Location filter for `fridge`, `freezer`, and `all` — pass (3 checks).
  - Sort by all five options, confirming each produces a distinct, correct order (Name A–Z,
    Newest added, Servings high→low, Category, Location), plus an explicit check that switching
    sort options actually changes the visible order — pass (6 checks).
  - Combined search + category + location + sort, and a second combo of search + category +
    sort — both compose correctly, not just in isolation — pass (2 checks).

No backend (chunks 02–04) exists in this worktree, so the "confirm `items` populates from
`GET /api/items`" verification from chunk 05 and the seeded-rows verification from chunk 06
were not exercised end-to-end here — `fetchItems`/`loadItems` are implemented per spec but
integration with a live server is left to the merge/reconciliation pass (chunk 10).
