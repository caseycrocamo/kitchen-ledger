# Chunk 04 — Backend containerization — Completion summary

## What was built (this chunk's actual deliverables)

- `server/Dockerfile` — multi-stage build. Build stage (`node:20-slim`): `npm ci`, copies source,
  `npm run build` (`tsc`) to `dist/`. Runtime stage (`node:20-slim`, not `alpine`, per spec —
  avoids `better-sqlite3` native-module/musl compile issues): `npm ci --omit=dev` for production
  deps only, copies compiled `dist/` from the build stage. Declares `VOLUME /app/data` for the
  SQLite file + uploads directory. `EXPOSE 3001`, `CMD ["node", "dist/index.js"]`.
- `server/.env.example` — documents `PORT`, `DB_PATH`, `UPLOADS_DIR` with comments noting the
  container paths live under the `/app/data` volume.
- `docker-compose.yml` (root) — two services:
  - `web` — builds root `Dockerfile` (frontend), maps host `8080:80`, `depends_on: api`.
  - `api` — builds `server/Dockerfile`, sets `PORT`/`DB_PATH`/`UPLOADS_DIR` env vars, mounts
    named volume `kitchen-data:/app/data`. Not exposed to the host — only reachable from `web`
    via the compose network, by service name `api`.
  - Named volume `kitchen-data` declared at the bottom.
- `nginx.conf` (modify) — added a `location /api/ { proxy_pass http://api:3001/api/; ... }` block
  alongside the existing `location /` block, forwarding `Host`, `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto` headers. Trailing slashes on both the location and the
  `proxy_pass` URI mean `/api/items` on the frontend container maps to `/api/items` on `api`
  (no path stripping surprises), matching the Express routes.

## Stand-ins created for chunks 01–03 (not this chunk's real scope)

None of `server/` existed yet in this worktree (other agents are building chunks 01–03 in
parallel worktrees). Created minimal, non-gold-plated stand-ins so there was an actual server to
containerize:

- `server/package.json`, `server/tsconfig.json` — chunk 01. Independent package (not a workspace),
  deps: `express`, `better-sqlite3`, `multer` + their `@types`, dev: `typescript`, `tsx`.
  Note: `tsconfig.json` omits `"moduleResolution": "node"` — TypeScript 6.0.3 (installed) treats
  that value as deprecated/erroring without an `ignoreDeprecations` flag; omitting it lets
  `"module": "commonjs"` imply the correct classic Node resolution with no warning.
- `server/src/types.ts`, `server/src/db.ts` — chunk 02. `Item` interface with `category`/
  `location` as string literal unions; `items` table via `CREATE TABLE IF NOT EXISTS`, opened at
  `process.env.DB_PATH` (falls back to `server/data/kitchen-ledger.db` for bare local runs).
- `server/src/index.ts`, `server/src/routes/items.ts` — chunk 03. Express app; `multer` disk
  storage into `process.env.UPLOADS_DIR`, UUID filenames, 8MB limit, image-only mimetype filter.
  Routes: `GET/POST /api/items`, `PATCH /api/items/:id` (multipart, image replace/remove via
  `removeImage=true`), `PATCH /api/items/:id/servings` (JSON `{ delta }`, atomic SQL clamp at 0),
  `DELETE /api/items/:id` (removes row + image file). Manual validation of `category`/`location`/
  `name`/`servings` on every write path; `400`/`404` per spec.

These stand-ins deliberately do not attempt anything the real chunk 01/02/03 agents weren't asked
for (no extra endpoints, no query params, no auth) — kept to what chunk 04 needed to exist.

## Also touched (minimal, adjacent to the stand-ins)

- `.gitignore` — added `server/node_modules`, `server/dist`, `server/data` (chunk 01's listed
  change; needed since `server/` now exists in this worktree).
- `.dockerignore` (root) — added `server` so the frontend (`web`) build context doesn't pick up
  backend source/artifacts (per chunk 01's note, and directly relevant since chunk 04's
  `docker-compose.yml` builds `web` from the same root context).
- `server/.dockerignore` (new) — excludes `node_modules`, `dist`, `data`, `.env` from the `api`
  build context.

## Verification performed

- `tsc -p server --noEmit` — clean, no errors.
- `tsc -p server` (full build) then ran the compiled server directly (`node dist/index.js`) against
  a scratch `DB_PATH`/`UPLOADS_DIR`/`PORT`, and exercised it with `curl`:
  - `GET /api/items` → `[]` on fresh DB.
  - `POST /api/items` (multipart, no image) → `201` with created row.
  - `GET /api/items` → returns the created item.
  - `POST` with invalid `category` → `400`.
  - `PATCH /api/items/1/servings` `{ "delta": -10 }` on `servings: 3` → clamped to `{"servings":0}`,
    not negative.
  - `DELETE /api/items/1` → `204`; subsequent `GET /api/items` → `[]`.
  - `DELETE` on nonexistent id → `404`.
  - All passed. Scratch DB/uploads/dist output was deleted afterward; nothing scratch-related is
    committed.
- Hand-reviewed `server/Dockerfile`, `docker-compose.yml`, `nginx.conf` against the spec:
  multi-stage build ✓, `node:20-slim` (not alpine) for both stages ✓, `/app/data` volume
  declared in the Dockerfile ✓, named volume `kitchen-data:/app/data` in compose ✓, `web`
  `depends_on: api` ✓, `/api/` `proxy_pass` block added alongside the existing `location /` ✓.

## What could NOT be verified (no `docker` binary in this environment)

- `docker compose up --build` was not run — this environment has no `docker` installed. Could not
  confirm:
  - Both `web` and `api` actually come up healthy from a real build (in particular, whether
    `better-sqlite3`'s prebuilt binary download succeeds inside `node:20-slim` at build time —
    this is the exact risk the spec's "use slim, not alpine" note is guarding against; slim's
    glibc should match available prebuilt binaries, so no compiler toolchain should be needed, but
    this is unverified without an actual build).
  - The nginx `/api/` proxy actually reaching the `api` container by its compose service name at
    runtime.
  - Image upload + `/api/uploads/<filename>` round-trip through the proxy.
  - Data/image persistence across `docker compose restart api` via the named volume.

  All of the above were reviewed statically against the spec and are believed correct, but real
  `docker compose up --build` verification is left for an environment with Docker available (the
  chunk 10 cross-cutting verification pass, or the team lead's merge/reconcile step).

## Known follow-up for whoever reconciles chunks 01–03

The stand-in `server/` files here are intentionally minimal and may conflict with (or be entirely
superseded by) the real chunk 01/02/03 agents' output once merged. Nothing in this chunk's actual
deliverables (`server/Dockerfile`, `server/.env.example`, `docker-compose.yml`, `nginx.conf`)
depends on any stand-in implementation detail beyond: the server listens on `PORT` (default 3001),
reads `DB_PATH`/`UPLOADS_DIR` from env, compiles via `tsc` to `dist/index.js`, and mounts its data
under `/app/data` in the container — all of which match the chunk 01–03 specs.
