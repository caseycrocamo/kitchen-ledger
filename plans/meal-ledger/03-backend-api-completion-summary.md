# Chunk 03 — Backend API — Completion Summary

## What was built (this chunk's actual scope)

- `server/src/index.ts` — Express app; JSON body parsing; `multer` disk storage into
  `process.env.UPLOADS_DIR` with `crypto.randomUUID() + extname(original)` filenames, 8MB size
  limit, `image/*` mimetype filter; mounts `express.static(UPLOADS_DIR)` at `/api/uploads`;
  mounts the items router at `/api/items`; a trailing error handler maps `MulterError` / the
  mimetype-filter error to `400`.
- `server/src/routes/items.ts` — `createItemsRouter(upload)` factory (takes the multer instance
  from `index.ts` rather than re-configuring multer, since the plan puts multer config in
  `index.ts` and routes in this file) implementing:
  - `GET /api/items` — all rows, `ORDER BY id`.
  - `POST /api/items` — multipart; validates `name` (non-empty), `category`
    (`'main'|'side'`), `location` (`'fridge'|'freezer'`), `servings` (optional, strict
    non-negative-integer string via `/^\d+$/`, defaults to `1` matching the DB default);
    optional `image` file. Returns `201` + created row.
  - `PATCH /api/items/:id` — multipart, any subset of `name`/`category`/`location`/`servings`;
    same validation per field, only applied if present. New `image` file deletes the old file
    (if any) then stores the new one; `removeImage=true` (string, since multipart) clears the
    image without a replacement when no new file is sent. Always bumps `updated_at` via SQL
    `CURRENT_TIMESTAMP`.
  - `PATCH /api/items/:id/servings` — JSON `{ delta: number }` (validated as a finite integer);
    single atomic `UPDATE items SET servings = MAX(0, servings + ?), updated_at =
    CURRENT_TIMESTAMP WHERE id = ?`; `result.changes === 0` is used to detect a missing id
    (avoids a separate existence check racing the update) and returns `404`. Returns the full
    updated item (superset of "the new value").
  - `DELETE /api/items/:id` — deletes the image file (if present, via `fs.rmSync(..., {force:
    true})` so a missing file is a no-op) then the row; `204` on success.
  - All `:id` params parsed with a strict `/^\d+$/` check; non-numeric or unknown ids → `404`.

## Stand-ins for chunks 01/02 (not yet present in this worktree)

Chunk 01/02 deliverables didn't exist here yet (each agent works in an isolated worktree), so
minimal versions were created to make chunk 03 compile and run against a real DB:

- `server/package.json` — independent package (not a workspace), `type: commonjs`, deps
  `express`, `better-sqlite3`, `multer`; scripts `dev` (`tsx watch src/index.ts`), `build`
  (`tsc`), `start` (`node dist/index.js`).
  - **Deviation from the master plan's pinned-in-spirit version**: used `multer@^2.0.2` instead
    of the `1.x` line. `npm install` flagged `multer@1.4.5-lts.2` as having patched
    vulnerabilities in the 2.x line; swapped to 2.x (API used here — `diskStorage`,
    `fileFilter`, `limits`, `.single()` — is unchanged) and `@types/multer@^2.0.0` to match.
    Flagging in case another chunk/agent standardizes on 1.x for a reason not visible here.
- `server/tsconfig.json` — `target: ES2022`, `module`/`moduleResolution: CommonJS`/`node`,
  `outDir: dist`, `rootDir: src`, `strict: true`.
- `server/src/types.ts` — `Item` interface with `category`/`location` string-literal unions,
  `created_at`/`updated_at` as `string`, per chunk 02's spec.
- `server/src/db.ts` — opens `better-sqlite3` at `process.env.DB_PATH` (mkdir -p the parent
  dir first), `PRAGMA journal_mode = WAL`, `CREATE TABLE IF NOT EXISTS items (...)` matching
  chunk 02's schema exactly (no `CHECK` on `category`/`location`; `servings CHECK (servings >=
  0)`; `created_at`/`updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`).
- Root `.gitignore` — added `server/node_modules`, `server/dist`, `server/data`.
- Root `.dockerignore` — added `server` (frontend Docker build context shouldn't pick it up).

Not created: `src/types.ts` (frontend duplicate — out of scope, no frontend consumer exists in
this worktree yet), `vite.config.ts`, root `package.json`/`tsconfig.json` changes — those are
chunk 01 proper and unrelated to getting the backend API compiling/running.

## Deviations / judgment calls

- `multer` 2.x instead of 1.x (see above).
- `PATCH /:id/servings` returns the full item JSON, not a bare number — the plan says "return
  the new value" but every other write endpoint returns the full row, and the full row contains
  the new value plus lets the client update its cache from one response shape.
- Malformed (non-numeric) `:id` values are treated as `404` (not `400`), consistent with "unknown
  id" — there's no valid id space they could belong to.

## Verification (run against scratch `DB_PATH=/tmp/kl-scratch/data.db`,
`UPLOADS_DIR=/tmp/kl-scratch/uploads`, `PORT=3011`, via `tsx watch src/index.ts`)

`npx tsc --noEmit` in `server/`: clean, no errors.

```
== GET empty ==
[]
HTTP 200

== POST with multipart incl. image ==
{"id":1,"name":"Chicken Curry","category":"main","location":"freezer","servings":3,"image_filename":"0ee147d5-3ac5-4a6e-8545-5d9f05befcd2.png","created_at":"2026-09-21 08:33:01","updated_at":"2026-09-21 08:33:01"}
HTTP 201
# uploads/ contains 0ee147d5-....png

== GET uploaded image (static /api/uploads) ==
HTTP 200

== PATCH fields + image swap ==
{"id":1,"name":"Chicken Curry","category":"main","location":"fridge","servings":5,"image_filename":"99a0477a-6b05-452d-bfc2-6b4af459f1e1.gif","created_at":"2026-09-21 08:33:01","updated_at":"2026-09-21 08:33:08"}
HTTP 200
# uploads/ now contains ONLY 99a0477a-....gif — old .png file was removed

== PATCH servings delta:-100 on servings=5 -> clamp at 0 ==
{"id":1, ..., "servings":0, ...}
HTTP 200

== PATCH servings delta:+2 ==
{"id":1, ..., "servings":2, ...}
HTTP 200

== PATCH removeImage=true ==
{"id":1, ..., "image_filename":null, ...}
HTTP 200
# uploads/ empty afterward

== POST bad category -> 400 ==
{"error":"category must be 'main' or 'side'"}
HTTP 400

== PATCH bad location -> 400 ==
{"error":"location must be 'fridge' or 'freezer'"}
HTTP 400

== PATCH unknown id -> 404 ==
{"error":"item not found"}
HTTP 404

== DELETE unknown id -> 404 ==
{"error":"item not found"}
HTTP 404

== PATCH servings on unknown id -> 404 ==
{"error":"item not found"}
HTTP 404

== POST item2 with image, then DELETE item2 ==
DELETE -> HTTP 204
# row gone from GET /api/items; uploads/ file for item2 removed too

== Concurrency: reset item1 servings=1, fire two concurrent PATCH .../servings {delta:-1} ==
Both responses: {"id":1, ..., "servings":0, ...}
# never negative — the atomic SQL clamp (plus better-sqlite3's synchronous, single-threaded
# execution) serializes the two updates safely
```

All Verification-section items from `03-backend-api.md` pass.
