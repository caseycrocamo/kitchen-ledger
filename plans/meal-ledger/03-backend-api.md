# Chunk 03 — Backend API

Corresponds to master plan Phase 2, steps 7–9.

**Depends on:** [02-backend-data-layer.md](02-backend-data-layer.md) (needs `db.ts` + `Item` type).

## Files

- `server/src/index.ts` *(new)*
- `server/src/routes/items.ts` *(new)*

## Steps

1. Scaffold `server/src/index.ts`: Express app, JSON body parsing, `multer` configured for
   `multipart/form-data` with disk storage into `process.env.UPLOADS_DIR`, filenames generated
   as `crypto.randomUUID() + extname(original)`, file size limit (~8MB), mimetype filter
   restricted to `image/*`.
2. Implement routes in `server/src/routes/items.ts`:
   - `GET /api/items` — all items as JSON (search/filter/sort stay client-side; dataset is
     small — see chunk 05/08).
   - `POST /api/items` — multipart body (`name`, `category`, `location`, `servings`, optional
     `image`); validate, insert, return created item.
   - `PATCH /api/items/:id` — multipart body, any subset of fields; if a new `image` is
     present, delete the old file (if any) then store the new one; `removeImage=true` clears the
     image without replacing it; bump `updated_at`.
   - `PATCH /api/items/:id/servings` — JSON body `{ delta: number }`; atomic
     `UPDATE items SET servings = MAX(0, servings + ?) WHERE id = ?`, return the new value.
     Dedicated endpoint so the zero-clamp is atomic in SQL rather than a client read-modify-write.
   - `DELETE /api/items/:id` — delete the row and its image file from disk if present.
   - `GET /api/uploads/:filename` — `express.static(UPLOADS_DIR)` mounted at `/api/uploads`, so
     both API calls and images live under the single `/api/` prefix nginx needs to proxy
     (see chunk 04).
3. Add manual input validation in the route handlers (no extra validation library): `category`
   must be exactly `'main'` or `'side'`; `location` must be exactly `'fridge'` or `'freezer'`;
   `name` non-empty; `servings` a non-negative integer. This validation is the *only* enum gate
   (chunk 02's DB has none) — it must run on every write path, not just create. `400` on bad
   input with a message; `404` for unknown `:id`.

## Verification

- Run the server locally (`tsx watch server/src/index.ts` or compiled + `node`) against a
  scratch `DB_PATH`/`UPLOADS_DIR`.
- `curl` walk-through: `GET /api/items` returns `[]` on a fresh DB; `POST` with multipart
  `name`/`category`/`location`/`servings` + an image file returns the created item and the file
  lands in `UPLOADS_DIR`; `PATCH /api/items/:id` updates fields and swaps the image (old file
  removed); `PATCH /api/items/:id/servings` with `{ "delta": -5 }` on a low-servings item clamps
  at 0, not negative; `DELETE /api/items/:id` removes the row and its image file.
- Confirm `400` for an invalid `category`/`location` value on both `POST` and `PATCH`, and
  `404` for a `PATCH`/`DELETE` on a nonexistent `id`.
- Fire two concurrent `PATCH .../servings` decrement requests at an item with `servings: 1` and
  confirm the result never goes negative (race-safety of the SQL clamp).

## Notes carried from the master plan

- **Servings increment/decrement is a dedicated endpoint** rather than routed through the
  general update endpoint, specifically to make the clamp-at-zero atomic in SQL.
- **No auth.** Single-user/household tool on a trusted network — out of scope unless the user
  says otherwise.
- **Client-side search/filter/sort**, so this API intentionally has no query-param filtering —
  `GET /api/items` always returns everything.
