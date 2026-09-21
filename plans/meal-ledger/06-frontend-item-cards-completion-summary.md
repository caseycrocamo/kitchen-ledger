# Chunk 06 completion summary — Item cards & home list

## Built (this chunk's actual scope)

- `src/components/ItemCard.tsx` — image (or initials-on-placeholder block when
  `image_filename` is null), name, category badge (Main/Side), location badge
  (Fridge/Freezer), servings counter with `–`/`+` buttons. Servings adjustment is
  optimistic: patches the shared `items` signal immediately, calls `updateServings`
  from `src/api.ts`, and rolls the signal back to the previous value if the request
  rejects. Edit/delete icon buttons render (inline SVG, no icon library dependency)
  but have no `onClick` handler yet — per spec, wired up in chunks 07/09.
- `src/components/ItemList.tsx` — renders `visibleItems` as a responsive grid
  (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Four states: loading skeleton (6
  pulsing placeholder cards) while `isLoading`, error banner + Retry button when
  `loadError` is set, empty-state message (distinguishes "no items yet" vs. "no
  items match your filters" using the underlying `items` count), and the card grid
  otherwise.
- `src/App.tsx` — mounts `<ItemList />` in the shell in place of the chunk 05
  placeholder text; calls `loadItems()` on mount via `useEffect`.

## Stand-ins built to make the above real (chunks 01/05 not yet present in this worktree)

Per instructions, these are deliberately minimal — effort went into ItemCard/ItemList.

- **Chunk 01 (tooling):** added `preact` + `@preact/signals` deps and
  `@preact/preset-vite` devDep to `package.json` (via `npm install`, versions
  resolved by npm); new `vite.config.ts` (preact plugin, `/api` → `localhost:3001`
  proxy); `tsconfig.json` gained `"jsx": "react-jsx"` /
  `"jsxImportSource": "preact"`. Did **not** create `server/` — out of scope for
  this chunk and not needed to exercise the frontend components.
- **Chunk 02 (Item type):** `src/types.ts` with the `Item` interface exactly as
  specified in `02-backend-data-layer.md` (`category`/`location` string-literal
  unions, `created_at`/`updated_at` as `string`).
- **Chunk 05 (shell/state):** `src/state.ts` with `items`, `searchQuery`,
  `categoryFilter`, `locationFilter`, `sortBy` signals and a `visibleItems`
  computed that's a pass-through of `items` (full filter/sort logic is chunk 08).
  Also added `isLoading` / `loadError` signals plus a `loadItems()` helper —
  these weren't explicitly named in chunk 05's step list but are required for
  this chunk's own spec'd skeleton/error-banner states to have something to read
  from, so they're the one place I went slightly beyond a literal pass-through
  stand-in. `src/api.ts` has `fetchItems`/`createItem`/`updateItem`/
  `updateServings`/`deleteItem`, building `FormData` for create/update and JSON
  for the servings delta, all against `/api/...`. `src/main.ts` renders `<App />`
  via `preact`'s `render()` — used `h(App, null)` instead of JSX so the file could
  stay `.ts` (as chunk 05 specifies) rather than becoming `.tsx`.

## Deviations from the chunk spec

- None in the chunk 06 files themselves. The only judgment call was adding
  `isLoading`/`loadError` signals in the chunk 05 stand-in (not explicitly listed
  in chunk 05's steps) since chunk 06's own spec requires a loading skeleton and
  an error banner, which need loading/error state to exist somewhere.

## Verification performed

Ran against a **real local round-trip**, not mocked data: a scratch Express server
(outside the repo, in the session scratchpad — not committed) seeded with two items
(one with a placeholder image file, one without), with Vite's `/api` proxy
temporarily pointed at it for testing and reverted back to `localhost:3001` before
committing.

- `npx tsc --noEmit` — clean.
- `npm run build` — clean production build.
- Cards render correctly both with and without an image (placeholder
  initials block shown for the no-image item); category/location badges and
  edit/delete icon buttons present.
- Servings `+` clicked on a card with `servings: 3` → optimistically showed `4`
  immediately; confirmed via `curl` against the scratch server that
  `PATCH /api/items/1/servings` was actually called and persisted; reloaded the
  page and the card still showed `4` (proves the round trip through
  `updateServings`, not just local state).
- Stopped the scratch backend entirely → error banner ("Couldn't load items" +
  message + Retry button) rendered instead of a blank/crashed page; only a
  network 502 appeared in the console, no unhandled exception.
- Restarted the backend and reloaded → data loaded successfully again (same code
  path `Retry` uses, since `Retry` also calls `loadItems()`).
- Reset the scratch server to an empty item list and reloaded → "No items yet"
  empty-state message rendered.
- Loading skeleton renders on initial mount (`isLoading` defaults to `true` until
  the first `fetchItems()` resolves) — confirmed in code path and via the
  skeleton grid's markup; not separately screenshotted mid-flight since the local
  fetch resolves in well under a frame.

Note: this machine runs several parallel agents against the same repo/worktree
host, and port 3001 plus a scratchpad `scratch-server` directory were both
already in use by another agent's session during testing — testing was done on
port 4001 instead, with the committed `vite.config.ts` proxy target reverted to
the spec'd `localhost:3001` before commit.

## Files touched

- `src/components/ItemCard.tsx` (new)
- `src/components/ItemList.tsx` (new)
- `src/App.tsx` (new — stand-in per chunk 05, updated per chunk 06 step 3)
- `src/state.ts` (new — chunk 05 stand-in)
- `src/api.ts` (new — chunk 05 stand-in)
- `src/types.ts` (new — chunk 02 stand-in)
- `src/main.ts` (modified — chunk 05 stand-in)
- `vite.config.ts` (new — chunk 01 stand-in)
- `tsconfig.json` (modified — chunk 01 stand-in)
- `package.json` / `package-lock.json` (modified — chunk 01 stand-in,
  preact/@preact/signals/@preact/preset-vite added)
