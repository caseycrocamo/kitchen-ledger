# Kitchen Ledger — Meal Ledger Feature Plan

## TL;DR

Build a household ledger of complete meal options (mains + sides) stored in the fridge/freezer, replacing the current placeholder screen. Each item has a name, category (main/side), location (fridge/freezer), servings count (increment/decrement), and an optional photo. The home page is a searchable, filterable, sortable card list.

Per user decisions, this is a full-stack build, not a client-only app:
- **UI**: Preact + `@preact/signals` (small, low-boilerplate, fine-grained reactivity — fits the "simple" bar better than React while avoiding hand-rolled DOM diffing).
- **Image capture**: a plain `<input type="file" accept="image/*" capture="environment">`. On mobile this opens the OS camera; on desktop it falls back to a file picker. No custom `getUserMedia` UI.
- **Persistence**: a real backend + database (Node/Express + SQLite via `better-sqlite3`), since the user explicitly asked for a backend over browser-local storage. Images are stored on disk (a mounted volume) with the DB holding only metadata/filename. The existing static nginx container becomes the frontend, proxying `/api/*` to a new backend container.

This turns the repo from a single static-site container into a two-container app (`web` + `api`) via `docker-compose.yml`, with nginx doing the reverse proxy.

## Steps

### Phase 0 — Repo restructuring & tooling

1. Add `@preact/signals` and `preact` as frontend dependencies; add `vite.config.ts` configuring the `preact` JSX pragma (via `@preact/preset-vite` or manual `esbuild.jsxFactory`/`jsxFragment` + `tsconfig.json` `jsx`/`jsxImportSource` settings) and a dev-server proxy (`server.proxy['/api'] -> http://localhost:3001`) so `npm run dev` talks to the backend without CORS.
2. Create a new `server/` directory as an independent Node/TypeScript package (own `package.json`, `tsconfig.json`) — kept separate from the frontend rather than an npm workspace, to keep each container's build context and dependency tree independent and simple.
3. Update root `.gitignore`/`.dockerignore` to cover `server/node_modules`, `server/dist`, and the local SQLite/uploads data directory used in dev.

### Phase 1 — Backend data layer

4. Design the `items` table (SQLite via `better-sqlite3`):
   - `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - `name TEXT NOT NULL`
   - `category TEXT NOT NULL` — no `CHECK` constraint; the main/side enum is enforced in the API layer only (see Decisions).
   - `location TEXT NOT NULL` — no `CHECK` constraint; the fridge/freezer enum is enforced in the API layer only (see Decisions).
   - `servings INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 0)`
   - `image_filename TEXT`
   - `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
5. Write a small startup migration (`server/src/db.ts`): open the DB file at `process.env.DB_PATH`, run `CREATE TABLE IF NOT EXISTS items (...)` on boot. No migration framework needed at this scale.
6. Define a shared `Item` TypeScript interface duplicated in `server/src/types.ts` and `src/types.ts` (small enough that a shared package isn't worth the build-context complexity — see Decisions). `category`/`location` are typed as string literal unions (`'main' | 'side'`, `'fridge' | 'freezer'`) so TypeScript enforces the enum at compile time even though the DB doesn't at runtime; `created_at`/`updated_at` are typed as `string` (ISO datetime as returned by SQLite/`better-sqlite3`).

### Phase 2 — Backend API

7. Scaffold `server/src/index.ts`: Express app, JSON body parsing, `multer` configured for `multipart/form-data` with disk storage into `process.env.UPLOADS_DIR`, filenames generated as `crypto.randomUUID() + extname(original)`, file size limit (~8MB), mimetype filter restricted to `image/*`.
8. Implement routes in `server/src/routes/items.ts`:
   - `GET /api/items` — returns all items as JSON (frontend does search/filter/sort client-side; the dataset is small enough that server-side querying isn't warranted).
   - `POST /api/items` — multipart body (`name`, `category`, `location`, `servings`, optional `image`); validates enum/non-empty/integer fields, inserts row, returns created item.
   - `PATCH /api/items/:id` — multipart body with any subset of fields; if a new `image` file is present, deletes the old file (if any) and stores the new one; supports a `removeImage=true` field to clear the image without replacing it; updates `updated_at`.
   - `PATCH /api/items/:id/servings` — JSON body `{ delta: number }`; runs an atomic `UPDATE items SET servings = MAX(0, servings + ?) WHERE id = ?` and returns the new value (avoids read-modify-write races between the +/- buttons).
   - `DELETE /api/items/:id` — deletes the row and its image file from disk if present.
   - `GET /api/uploads/:filename` — served via `express.static(UPLOADS_DIR)` mounted at `/api/uploads`, so both API calls and images live under the single `/api/` prefix nginx needs to proxy.
9. Add input validation in the route handlers (manual checks, no extra validation library needed): `category` must be exactly `'main'` or `'side'`, `location` must be exactly `'fridge'` or `'freezer'`, `name` non-empty, `servings` a non-negative integer. Since the database no longer enforces these enums via `CHECK`, this API-layer validation is the *only* gate — every write path (`POST`, `PATCH`) must run it, not just the initial create. Return `400` with a message on bad input; return `404` for unknown `:id`.

### Phase 3 — Backend containerization

10. Write `server/Dockerfile`: multi-stage build — build stage compiles TypeScript (`tsc`), runtime stage (`node:20-slim`, not `alpine`, to avoid `better-sqlite3` native-module compile issues) installs production deps and copies the compiled `dist/`. Declare a `/app/data` volume mount point for the SQLite file + uploads directory.
11. Add `server/.env.example` documenting `PORT`, `DB_PATH`, `UPLOADS_DIR`.
12. Create root `docker-compose.yml` with two services:
    - `web`: builds the existing root `Dockerfile` (frontend), depends on `api`.
    - `api`: builds `server/Dockerfile`, mounts a named volume (`kitchen-data:/app/data`) for persistence across restarts.
13. Update `nginx.conf` to add a `location /api/ { proxy_pass http://api:3001/api/; proxy_set_header Host $host; ... }` block so the frontend container transparently forwards API/image requests to the backend container by its compose service name.

### Phase 4 — Frontend app shell & state

14. Set up `src/state.ts`: a `items` signal (`Signal<Item[]>`) populated from `GET /api/items` on load; `searchQuery`, `categoryFilter` (`'all' | 'main' | 'side'`), `locationFilter` (`'all' | 'fridge' | 'freezer'`), and `sortBy` signals; a `visibleItems` computed signal that applies search → filter → sort over `items`.
15. Write `src/api.ts`: thin fetch wrapper functions — `fetchItems`, `createItem`, `updateItem`, `updateServings`, `deleteItem` — building `FormData` for create/update and JSON for the servings delta call.
16. Replace `src/main.ts`'s placeholder markup with a Preact root render (`render(<App />, document.getElementById('app'))`), introducing `src/App.tsx`.

### Phase 5 — Home page & item cards

17. Build `src/components/ItemCard.tsx`: displays image (or a placeholder icon/initials block if `image_filename` is null), name, a category badge (Main/Side), a location badge (Fridge/Freezer), a servings counter with `–`/`+` buttons (optimistic update via signal, calls `updateServings`, rolls back on request failure), and edit/delete icon buttons.
18. Build `src/components/ItemList.tsx`: renders `visibleItems` as a responsive card grid (Tailwind grid, e.g. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`); renders an empty-state message when the list (or filtered result) is empty; renders a loading skeleton during initial fetch and an error banner with a retry button on fetch failure.

### Phase 6 — Add / edit item form

19. Build `src/components/ItemFormModal.tsx`, shared between "add" and "edit" flows: name text input, category select (Main/Side), location select (Fridge/Freezer), servings number input (default 1, min 0), the camera/file `<input type="file" accept="image/*" capture="environment">` with a thumbnail preview of the selected/existing image and a "remove image" option when editing.
20. Wire a floating/header "Add item" button that opens the modal in create mode; wire the card's edit button to open it pre-filled in edit mode; on submit, call `createItem`/`updateItem`, update the `items` signal with the server response, and close the modal. Show inline validation errors from the API (e.g. empty name).

### Phase 7 — Search, filter, sort controls

21. Build `src/components/Toolbar.tsx` above the card grid: a text search input bound to `searchQuery`; category and location filter controls (segmented buttons or selects) bound to their signals; a sort `<select>` bound to `sortBy` with options — Name (A–Z), Newest added, Servings (high→low), Category, Location.
22. Implement the filter/sort logic itself in `src/state.ts`'s `visibleItems` computed (case-insensitive substring match on name; equality filters on category/location; comparator per `sortBy` value) rather than scattering logic across components.

### Phase 8 — Delete flow

23. Wire the card's delete button to a small confirmation step (a lightweight confirm modal component, not the native `confirm()`, to match the app's styling) before calling `deleteItem` and removing the item from the `items` signal.

### Phase 9 — Verification pass

24. Manual end-to-end pass covering: add an item with an image, add one without an image, edit name/category/location/servings, replace an image, remove an image, increment/decrement servings (including clamping at 0), delete an item, search by partial name, filter by each category/location combination, sort by every option, and reload the page to confirm data survived (served from the backend, not just in-memory state).
25. `docker compose up --build` end-to-end check: confirm the site loads on the mapped port, confirm add/edit/delete/image-upload work through the nginx proxy, restart the `api` container and confirm data + images persisted via the named volume.

## Relevant Files

**Existing files to modify:**
- `package.json` — add `preact`, `@preact/signals` (and `@preact/preset-vite` if used for JSX).
- `tsconfig.json` — add `"jsx": "react-jsx"`, `"jsxImportSource": "preact"`.
- `src/main.ts` — replace placeholder `innerHTML` block with Preact `render(...)`.
- `src/style.css` — no structural change expected beyond whatever component classes need; stays Tailwind-only.
- `Dockerfile` — unchanged in substance (still builds the frontend), but now one of two services in compose.
- `nginx.conf` — add the `/api/` `proxy_pass` location block.
- `.gitignore` / `.dockerignore` — add `server/node_modules`, `server/dist`, local data dir.

**New files:**
- `vite.config.ts` — preact plugin + dev proxy.
- `src/App.tsx`, `src/components/ItemCard.tsx`, `src/components/ItemList.tsx`, `src/components/ItemFormModal.tsx`, `src/components/Toolbar.tsx`, `src/components/ConfirmModal.tsx`.
- `src/state.ts`, `src/api.ts`, `src/types.ts`.
- `server/package.json`, `server/tsconfig.json`, `server/Dockerfile`, `server/.env.example`.
- `server/src/index.ts`, `server/src/db.ts`, `server/src/types.ts`, `server/src/routes/items.ts`.
- `docker-compose.yml`.

## Verification

- `npm run build` (frontend) and `tsc -p server` (backend) both type-check cleanly.
- `npm run dev` + backend run locally (`npm run dev` in `server/`, or `ts-node-dev`/`tsx` watch) with the Vite proxy: exercise the full CRUD + servings + search/filter/sort flow in a browser, including selecting a photo via the file input.
- On an actual phone (or a mobile-emulated browser), confirm the file input opens the camera via `capture="environment"`.
- `docker compose up --build`: confirm `web` serves the app, `/api/*` calls proxied to `api` succeed, uploaded images render, and data survives an `api` container restart (named volume).
- Manually verify servings can't go below 0 via rapid decrement clicks (server-side clamp holds even if two requests race).
- Manually verify deleting an item also removes its image file from the uploads volume (no orphaned files) — spot check via `docker compose exec api ls /app/data/uploads`.

## Decisions

- **Preact + signals** over vanilla DOM or React, per user choice — smallest reasonable step up in ergonomics without React's bundle/setup weight.
- **Native file/camera input** (`capture="environment"`) over a custom `getUserMedia` view, per user choice — far less code, works on desktop too.
- **Backend + SQLite** over browser-local storage, per user choice. SQLite (not Postgres) because this is a single-household, low-concurrency app — one file, trivial backup, no extra container.
- **Images on disk, metadata in DB** — keeps the DB tiny and avoids BLOB handling; a Docker named volume covers persistence.
- **No auth** — single-user/household tool on a trusted network; out of scope unless the user says otherwise.
- **Client-side search/filter/sort** — the item list is expected to be small (a fridge/freezer's worth of meals), so filtering in the browser over a `GET /api/items` payload is simpler than building query-param support into the API.
- **No shared frontend/backend package** — the `Item` type is duplicated in `src/types.ts` and `server/src/types.ts` rather than set up as an npm workspace, to keep each container's build independent and simple. Revisit only if the type surface grows.
- **Servings increment/decrement is a dedicated endpoint** (`PATCH /api/items/:id/servings` with `{ delta }`) rather than routed through the general update endpoint, so the clamp-at-zero logic is atomic in SQL rather than a client read-modify-write.
- **`category`/`location` enums enforced in the API layer, not via SQLite `CHECK` constraints**, per user instruction. TypeScript union types plus route-handler validation are the actual guardrail; the DB columns are plain `TEXT`. Every write path (create and update) must call the same validation — there's no DB-level backstop if a code path skips it.
- **`created_at`/`updated_at` declared as `DATETIME`** (`DEFAULT CURRENT_TIMESTAMP`), per user instruction, rather than `TEXT`. Note SQLite itself has no dedicated datetime storage class — a `DATETIME`-declared column gets NUMERIC affinity but `CURRENT_TIMESTAMP` still stores an ISO8601-style string (`YYYY-MM-DD HH:MM:SS`), so `better-sqlite3` reads them back as strings; the column type communicates intent and lets tooling (e.g. a future ORM or DB browser) treat them as dates.

## Further Considerations

- **Multiple photos per item**: not requested; current design is one optional image per item. Easy to extend later (a child `images` table) if needed.
- **Units/expiry dates**: not requested (no "use by" date or portion-size unit was mentioned) — the ledger only tracks servings count, not expiration. Flag if freshness tracking turns out to matter.
- **Multi-user concurrency**: the servings endpoint is race-safe, but two people editing the *same* item's name/category simultaneously will last-write-wins with no conflict warning. Reasonable for a household app; would need optimistic-concurrency tokens if that becomes a problem.
- **Image compression**: photos taken directly from a phone camera can be several MB; the plan caps upload size (~8MB) but does not resize/compress on upload. Could add client-side downscaling (canvas resize before upload) later if storage or load time becomes an issue.
- **Deployment port/TLS**: `docker-compose.yml` as planned exposes `web` on a host port with plain HTTP, matching the current nginx setup — no TLS/reverse-proxy-in-front-of-this-proxy is assumed; flag if this needs to sit behind an existing reverse proxy or get HTTPS.
