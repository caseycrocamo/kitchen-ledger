# Chunk 09 — Delete flow: completion summary

## What was built (this chunk's actual scope)

- `src/components/ConfirmModal.tsx` *(new)* — reusable confirm dialog: `open`/`title`/`message`/
  `confirmLabel`/`cancelLabel`/`destructive`/`busy` props, `onConfirm`/`onCancel` callbacks.
  Backdrop click and `Escape` both cancel (disabled while `busy`); confirm button autofocuses on
  open; `role="alertdialog"` + `aria-modal`/`aria-labelledby`/`aria-describedby` for
  accessibility; destructive styling (red confirm button) used for delete.
- `src/components/ItemCard.tsx` *(modify)* — delete icon button now opens `ConfirmModal` (local
  `confirmOpen` state) instead of doing nothing. On confirm: calls `deleteItem(id)` from
  `src/api.ts`, and on success filters the item out of the `items` signal and closes the modal;
  on failure the modal stays open (with the item still in the list) so the user can retry or
  cancel; a `busy`/`deleting` flag disables the modal buttons and shows "Working…" during the
  request.

## Stand-ins built to make this functional end-to-end

Chunks 01/05/06 don't exist yet in this worktree, so the following were built as reasonably
complete (not gold-plated) stand-ins per the task instructions:

- **Chunk 01 (Preact tooling):** `preact` + `@preact/signals` added to `package.json`
  dependencies, `@preact/preset-vite` added to devDependencies; new `vite.config.ts` (preact
  plugin + `/api` → `http://localhost:3001` proxy); `tsconfig.json` got `"jsx": "react-jsx"` /
  `"jsxImportSource": "preact"`. Did *not* touch `.gitignore`/`.dockerignore`/`server/` — out of
  this chunk's file scope and not needed to make the delete flow work.
- **Chunk 02 (`Item` type, frontend half only):** `src/types.ts` — `Item` interface with
  `category`/`location` string-literal unions, matching the schema in
  `plans/meal-ledger/02-backend-data-layer.md`.
- **Chunk 05 (shell & state):** `src/state.ts` (`items`, `itemsLoading`, `itemsError` signals,
  filter/sort signals, pass-through `visibleItems` computed — full filter logic is chunk 08's
  job); `src/api.ts` (`fetchItems`/`createItem`/`updateItem`/`updateServings`/`deleteItem` fetch
  wrappers); `src/App.tsx` (root component, loads items on mount via an exported `loadItems()`
  used both on mount and as the retry handler); `src/main.tsx` replacing the old `src/main.ts`
  placeholder (renamed since it now needs JSX) with a Preact `render()` call — `index.html`
  updated to point at `main.tsx`.
- **Chunk 06 (item cards & list):** `src/components/ItemCard.tsx` (image or initials placeholder,
  category/location badges, optimistic servings `–`/`+` with rollback on failure, inert-looking
  edit button, real delete button wired to this chunk's `ConfirmModal`); `src/components/
  ItemList.tsx` (responsive grid, loading skeleton, error banner + retry, empty state).

Deliberately left minimal/deferred to the real chunk owners: edit button is present but does
nothing (chunk 07's job); toolbar/search/filter UI doesn't exist (chunk 08's job — `state.ts`
signals are wired for it); no `server/` package was created (chunk 01/02/03/04's job).

## Deviations from the plan text

None of substance. `src/main.ts` became `src/main.tsx` (not explicitly called out in chunk 05,
but required once it contains JSX under this project's `verbatimModuleSyntax`/bundler tsconfig).

## Verification

Ran via a scratch, throwaway Node `http` backend (`GET /api/items`, `DELETE /api/items/:id`,
`PATCH /api/items/:id/servings` against an in-memory array; not committed, lived in the session
scratchpad) proxied through `npm run dev`'s Vite server, driven with the browser tool — this
covers a genuine live round-trip against a running server, not just mocked `fetch` responses:

- `npm install` — succeeds (107 packages).
- `npx tsc --noEmit` — clean.
- `npm run build` — `tsc && vite build` succeeds.
- Clicked the delete icon on an item card: custom `ConfirmModal` appears (screenshotted) — not a
  native `confirm()` dialog.
- Clicked **Cancel**: modal closes, item remains in the list and in the backend (`curl
  localhost:3001/api/items` still showed both seeded items).
- Clicked delete again, then **Delete**: button showed a "Working…" busy state, then the item
  disappeared from the list immediately.
- Reloaded the page (`navigate` to the same URL, forcing a fresh `GET /api/items`): deleted item
  stayed gone, confirmed both in the rendered UI and via `curl localhost:3001/api/items` (only
  the non-deleted item remained).
- No console errors at any point (`read_console_messages` checked after reload).

**Not verified:** the plan's last bullet (deleted item's uploaded image file being removed from
disk, not orphaned) — that's chunk 03's `DELETE` route responsibility and needs the real
`server/` package with multer/upload storage, which doesn't exist in this worktree. The scratch
backend used for verification has no image/upload support and the seeded items had no
`image_filename`. This should be re-checked once chunks 01–04 land for real and get merged
alongside this chunk's work.
