# Chunk 04 — Backend containerization

Corresponds to master plan Phase 3, steps 10–13.

**Depends on:** [03-backend-api.md](03-backend-api.md) (needs a working server to containerize).

## Files

- `server/Dockerfile` *(new)*
- `server/.env.example` *(new)*
- `docker-compose.yml` *(new)*
- `nginx.conf` *(modify)* — current file has one `location /` block only; needs an `/api/` block added.

## Steps

1. Write `server/Dockerfile`: multi-stage build — build stage compiles TypeScript (`tsc`),
   runtime stage on `node:20-slim` (not `alpine` — avoids `better-sqlite3` native-module compile
   issues) installs production deps and copies the compiled `dist/`. Declare a `/app/data`
   volume mount point for the SQLite file + uploads directory.
2. Add `server/.env.example` documenting `PORT`, `DB_PATH`, `UPLOADS_DIR`.
3. Create root `docker-compose.yml` with two services:
   - `web` — builds the existing root `Dockerfile` (frontend), depends on `api`.
   - `api` — builds `server/Dockerfile`, mounts a named volume (`kitchen-data:/app/data`) for
     persistence across restarts.
4. Update `nginx.conf`: add a `location /api/ { proxy_pass http://api:3001/api/; proxy_set_header
   Host $host; ... }` block alongside the existing `location /` block, so the frontend container
   forwards API/image requests to the backend container by its compose service name (`api`).
   The root `Dockerfile` itself doesn't need to change — it just now builds one of two
   compose services instead of the whole app.

## Verification

- `docker compose up --build`: both `web` and `api` come up healthy.
- Hit the mapped `web` port in a browser or via `curl`; confirm `/api/items` proxies through to
  the `api` container and returns JSON.
- Upload an image through the API (via `curl` or the not-yet-built frontend) and confirm it's
  reachable at `/api/uploads/<filename>` through the same proxy.
- `docker compose restart api` (or stop/start), then confirm the SQLite data and uploaded images
  survived — `docker compose exec api ls /app/data` and `/app/data/uploads`.

## Notes carried from the master plan

- **SQLite, not Postgres** — single-household, low-concurrency app; one file, trivial backup,
  no extra container.
- **Images on disk, metadata in DB** — keeps the DB tiny, avoids BLOB handling; the named volume
  covers persistence for both.
- **Deployment port/TLS** — compose as planned exposes `web` on a host port with plain HTTP,
  matching the current nginx setup; no TLS or upstream reverse proxy assumed. Flag to the user
  if this needs to sit behind an existing reverse proxy or get HTTPS.
