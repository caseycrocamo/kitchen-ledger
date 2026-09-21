# Chunk 05 — Frontend app shell & state

Corresponds to master plan Phase 4, steps 14–16.

**Depends on:** [01-repo-scaffolding.md](01-repo-scaffolding.md) (Preact/JSX tooling). Live data
needs [03-backend-api.md](03-backend-api.md) (or [04](04-backend-containerization.md)) running,
but the shell itself can be built and rendered against an empty/failed fetch first.

## Files

- `src/state.ts` *(new)*
- `src/api.ts` *(new)*
- `src/main.ts` *(modify)* — replace the current placeholder `innerHTML` block (see current
  content below) with a Preact root render.
- `src/App.tsx` *(new)*

Current `src/main.ts` being replaced: imports `./style.css`, grabs `#app`, and sets
`app.innerHTML` to a static "Kitchen Ledger / Track what's in your kitchen" block. That entire
body gets replaced by a Preact `render()` call.

## Steps

1. Build `src/state.ts`: an `items` signal (`Signal<Item[]>`, from `src/types.ts` added in
   chunk 02) populated from `GET /api/items` on load; `searchQuery`, `categoryFilter`
   (`'all' | 'main' | 'side'`), `locationFilter` (`'all' | 'fridge' | 'freezer'`), and `sortBy`
   signals; a `visibleItems` computed signal (full filter/sort logic lands in chunk 08 — here it
   can start as a pass-through of `items`).
2. Build `src/api.ts`: thin fetch wrapper functions — `fetchItems`, `createItem`, `updateItem`,
   `updateServings`, `deleteItem` — building `FormData` for create/update and JSON for the
   servings delta call, all hitting `/api/...` (proxied by Vite in dev per chunk 01, by nginx in
   prod per chunk 04).
3. Replace `src/main.ts`'s placeholder markup with `render(<App />, document.getElementById('app'))`.
4. Create `src/App.tsx` as the root component — for this chunk, just enough to call `fetchItems`
   into the `items` signal on mount and render a placeholder ("Loading…" / item count). Real UI
   arrives in chunks 06–09.

## Verification

- `npm run dev` renders the new (minimal) `App` shell with no console errors.
- With a backend running (local `npm run dev` in `server/`, or the chunk 04 compose stack) and
  the Vite proxy in place, confirm `items` populates from `GET /api/items` — check via a
  temporary `console.log` or the Preact devtools, since there's no real UI yet.
- Confirm the app doesn't crash when the backend is unreachable (fetch failure is caught, not
  unhandled) — full error-banner UX comes in chunk 06.

## Notes carried from the master plan

- **Preact + `@preact/signals`** chosen over vanilla DOM or React — small, low-boilerplate,
  fine-grained reactivity, avoids hand-rolled DOM diffing.
