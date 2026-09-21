# Chunk 02 — Backend data layer — completion summary

## What was built (this chunk)

- `server/src/db.ts` — opens the SQLite DB at `process.env.DB_PATH` (throws if unset), ensures
  the parent directory exists, enables WAL mode, and runs `CREATE TABLE IF NOT EXISTS items (...)`
  on module load, matching the spec's column list exactly (`id`, `name`, `category`, `location`,
  `servings` with `CHECK (servings >= 0)`, `image_filename`, `created_at`/`updated_at` as
  `DATETIME DEFAULT CURRENT_TIMESTAMP`). Exports the `Database` instance (named `db` + default).
- `server/src/types.ts` — `Item` interface with `ItemCategory` (`'main' | 'side'`) and
  `ItemLocation` (`'fridge' | 'freezer'`) string-literal unions; `created_at`/`updated_at` typed
  as `string`; `image_filename` typed `string | null`.
- `src/types.ts` — byte-for-byte duplicate of the above interface for the frontend, per the
  "no shared package" decision in the master plan.

## Chunk-01 stand-in

Chunk 01 (repo scaffolding) hadn't landed in this worktree yet, so I created the minimal
`server/` package skeleton needed for this chunk to compile/run, scoped to what 02 actually
depends on (not full chunk 01):

- `server/package.json` — deps `express`, `better-sqlite3`, `multer`; devDeps
  `typescript`, `tsx` (dev/verification runner), `@types/node`, `@types/express`,
  `@types/multer`, `@types/better-sqlite3`. Scripts: `build` (`tsc`), `dev` (`tsx watch
  src/index.ts` — placeholder target, chunk 03 will create `index.ts`), `start` (`node
  dist/index.js`).
- `server/tsconfig.json` — `target: ES2022`, `module: CommonJS`, `outDir: dist`,
  `rootDir: src`, `strict: true`, `esModuleInterop: true`.
- `.gitignore` / `.dockerignore` — added `server/node_modules`, `server/dist`, `server/data/`
  (gitignore) and `server` (dockerignore), since the root `Dockerfile`/frontend build context
  shouldn't pick up backend artifacts.
- Did **not** touch root `package.json`/`vite.config.ts`/root `tsconfig.json` jsx settings —
  out of scope for this chunk (no `.tsx` files were added; `src/types.ts` is plain TS) and left
  for whichever agent lands chunk 01 to avoid clobbering their work.
- Ran `npm install` inside `server/` to produce `server/package-lock.json` /
  `server/node_modules` (latter gitignored, not committed).

## Deviations from the plan text

- `server/tsconfig.json` omits an explicit `moduleResolution` (rather than `"node"`) — the
  installed TypeScript (5.9.3) flags `moduleResolution: node` (i.e. `node10`) as deprecated
  (TS5107). Leaving it unset lets `module: CommonJS` imply the classic Node resolution without
  the deprecation warning; behavior is unchanged for this package's needs.
- Package versions in `server/package.json` were pinned to current-ish ranges (not dictated by
  the plan, which only names the packages): `express@^4.19.2`, `better-sqlite3@^11.3.0`,
  `multer@^1.4.5-lts.1` (resolved to `1.4.5-lts.2`), `typescript@^5.5.0` (resolved to 5.9.3
  already present at repo root's own toolchain), `tsx@^4.19.0`.

## Verification results

- `npx tsc -p server --noEmit` → passes cleanly (no errors).
- `npx tsc --noEmit` at repo root → still passes (new `src/types.ts` doesn't disturb root build).
- Exercised `server/src/db.ts` directly: `DB_PATH=/tmp/kitchen-ledger-verify.sqlite npx tsx
  server/src/db.ts` → ran without error, created the SQLite file.
- `sqlite3 /tmp/kitchen-ledger-verify.sqlite ".schema items"` confirmed the `items` table exists
  with exactly the columns/constraints specified (`CHECK (servings >= 0)`,
  `DEFAULT CURRENT_TIMESTAMP` on both timestamp columns, no `CHECK` on `category`/`location`).
- Throwaway DB file (and its `-wal`/`-shm` siblings) deleted after verification — nothing left
  under `/tmp`.

## Handoff notes for other chunks

- Chunk 03 (`server/src/index.ts`, `server/src/routes/items.ts`) can import `db` from
  `./db` and `Item`/`ItemCategory`/`ItemLocation` from `./types` as-is.
- Chunk 01's agent should feel free to overwrite `server/package.json` /
  `server/tsconfig.json` if their version differs meaningfully (e.g. dev-watch tool choice) —
  this stand-in only needs to satisfy this chunk's own verification, not be the final word.
