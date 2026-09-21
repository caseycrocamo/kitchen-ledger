# Chunk 07 completion summary — Add/edit item form

## What was built

### Real chunk-07 work
- `src/components/ItemFormModal.tsx` *(new)* — shared add/edit modal:
  - Name text input, category select (Main/Side), location select (Fridge/Freezer), servings
    number input (default `1` for create, min `0`, clamped/truncated client-side).
  - Photo input: `<input type="file" accept="image/*" capture="environment">` with a live
    thumbnail preview (object URL for a freshly-picked file, or the existing
    `/api/uploads/:filename` URL in edit mode), plus a "Remove image" button that appears
    whenever a preview is showing (works for both a freshly-picked file and an existing
    server image).
  - Image state machine: `imageFile` (new upload) / `imageRemoved` (explicit clear) /
    `previewUrl`, with object-URL cleanup via `useEffect`. Picking a new file after removing
    resets `imageRemoved`, so "replace" and "remove without replacing" are mutually exclusive
    outcomes sent to the API (`image` vs. `removeImage: true`).
  - Submit calls `createItem`/`updateItem` from `src/api.ts`, merges the server response into
    the `items` signal (append on create, replace-by-id on edit), then closes. No client-side
    "name required" gate — submission always reaches the API so its `400` message renders
    inline (`role="alert"`) inside the modal, per the chunk's explicit verification requirement.
- `src/App.tsx` *(modify from stand-in)* — header "+ Add item" button opens the modal in
  create mode; modal open/mode state (`{mode:'create'} | {mode:'edit', item} | null`).
- `src/components/ItemCard.tsx` *(modify from stand-in)* — edit (pencil) button now calls
  `onEdit(item)`, wired up through `ItemList` to `App`'s modal state, opening the form
  pre-filled. Delete button stays inert/disabled (chunk 09's job).

### Stand-ins (chunk 01 / 05 / 06 — none of this existed in the worktree)
- `package.json`, `tsconfig.json`, `vite.config.ts` — Preact + `@preact/signals` +
  `@preact/preset-vite` tooling, `jsx: "react-jsx"` / `jsxImportSource: "preact"`, dev proxy
  `/api` → `http://localhost:3001` (chunk 01).
- `src/types.ts` — frontend `Item`/`Category`/`Location` types matching chunk 02's spec.
- `src/api.ts` — `fetchItems`, `createItem`, `updateItem`, `updateServings`, `deleteItem`
  fetch wrappers (multipart `FormData` for create/update, JSON for the servings delta), plus
  an `ApiError` class carrying the API's error message and status for the form's inline-error
  use case.
- `src/state.ts` — `items`/`itemsLoading`/`itemsError` signals, `loadItems()`, and pass-through
  filter signals (`searchQuery`, `categoryFilter`, `locationFilter`, `sortBy`) /
  `visibleItems` computed, left as a no-op pass-through per chunk 05's spec (real logic is
  chunk 08's).
- `src/main.ts` — replaced the placeholder `innerHTML` block with
  `render(h(App, null), document.getElementById('app'))`.
- `src/components/ItemCard.tsx` / `ItemList.tsx` — image-or-initials block, category/location
  badges, optimistic servings +/- (rolls back on failure), responsive grid, loading skeleton,
  error banner with retry, empty state — per chunk 06's spec, kept intentionally minimal.

Kept deliberately un-gold-plated: no toolbar/search/filter/sort UI (chunk 08), no delete
confirmation flow (chunk 09), no image compression (explicitly out of scope per the master
plan notes).

## Deviations / notes

- **`main.ts` must use `h(App, null)`, not a bare `App()` call.** Calling the component as a
  plain function bypasses Preact's render/hook lifecycle entirely and throws inside
  `@preact/signals`' hook patching (`Cannot read properties of undefined (reading '__$f')`)
  the moment any hook runs. Worth flagging to whichever agent/session reconciles chunk 05,
  since a naive stand-in could easily reintroduce this.
- Investigated but **not** the cause (ruled out during debugging, left as-is): `@prefresh`
  (Vite's Preact Fast Refresh plugin) vs. `@preact/signals` interaction. Initially suspected
  because of a scary console error, but it turned out to be a **stale console-log entry
  persisting across page reloads in the same browser tab** in this environment's browser tool
  — a fresh tab showed no error at all, with or without `prefreshEnabled`. `vite.config.ts`
  keeps the default (`preact()`, prefresh on).
- No changes needed to `src/style.css`, `index.html`, `.gitignore`, or `.dockerignore` —
  Tailwind v4's `@import "tailwindcss"` and the existing `#app` mount point needed nothing
  chunk-specific.

## Verification

Ran against a **live scratch backend** (not mocked responses), per the chunk's "or" option —
a small in-memory Express + multer server (`server.mjs`, not committed, lived under this
session's scratchpad dir) implementing the exact `GET/POST/PATCH /api/items`,
`PATCH /api/items/:id/servings` contract from `03-backend-api.md` (400 on empty
name/bad category/location, image swap-and-delete-old-file on `PATCH` with a new `image`,
`removeImage=true` clears without replacing). Real backend chunk (03) was already occupying
port 3001 in another agent's worktree, so the scratch server ran on 3002 with
`vite.config.ts`'s proxy temporarily pointed there; the proxy target was reverted to
`http://localhost:3001` (the spec'd port) before committing, and `tsc --noEmit` / `npm run
build` were re-run clean after the revert.

Checked in a real browser (Claude Browser tool) against `npm run dev`:
- **Add item without a photo** — "Leftover Soup" created, no-image placeholder ("LE" initials)
  rendered, persisted (`GET /api/items` confirms `image_filename: null`).
- **Add item with a photo** — "Frozen Peas" created with a simulated file selection
  (`DataTransfer`-based, since the automated browser tool has no native OS file-picker
  automation); thumbnail preview appeared before submit, image uploaded and rendered from
  `/api/uploads/:filename` after submit.
- **`capture="environment"` present** — confirmed via
  `input.getAttribute('capture') === 'environment'` (and `accept === 'image/*'`) on the file
  input in the running page.
- **Edit fields independently**:
  - Changed category + location + servings together on "Frozen Peas" (Main/Fridge/1 →
    Side/Freezer/5) and confirmed all three persisted via `GET /api/items`.
  - Separately, changed only the name on "Leftover Soup" (→ "Leftover Chili") and confirmed
    category/location/servings/image were untouched.
- **Replace an existing image** — re-opened "Frozen Peas" (image already removed by the prior
  step), attached a new file, saved; server response showed a new `image_filename` distinct
  from the original.
- **Remove an image without replacing** — on "Frozen Peas" (had an image from the add-with-photo
  step), clicked "Remove image" (no new file chosen) and saved; card fell back to the
  initials placeholder, `GET /api/items` confirmed `image_filename: null`.
- **Empty name → inline API error** — submitted the create form with a blank name; the
  scratch server's `400 { error: "name is required" }` rendered inline inside the modal
  (`role="alert"`, "name is required") instead of failing silently or closing the modal.

Not exercised: real mobile-camera capture behavior (only the `capture` attribute was
verified, not actual OS camera-app hand-off, which needs a physical/emulated mobile browser
outside this tool's reach) and the servings +/- optimistic-rollback path on the `ItemCard`
stand-in (out of this chunk's scope — chunk 06's own concern).
