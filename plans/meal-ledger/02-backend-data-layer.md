# Chunk 02 — Backend data layer

Corresponds to master plan Phase 1, steps 4–6.

**Depends on:** [01-repo-scaffolding.md](01-repo-scaffolding.md) (needs `server/` package + tsconfig in place).

## Files

- `server/src/db.ts` *(new)*
- `server/src/types.ts` *(new)*
- `src/types.ts` *(new)* — frontend-side duplicate of the `Item` interface.

## Steps

1. Design the `items` table (SQLite via `better-sqlite3`):
   - `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - `name TEXT NOT NULL`
   - `category TEXT NOT NULL` — no `CHECK` constraint (enum enforced in the API layer only, chunk 03)
   - `location TEXT NOT NULL` — no `CHECK` constraint (same)
   - `servings INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 0)`
   - `image_filename TEXT`
   - `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
2. Write `server/src/db.ts`: open the DB file at `process.env.DB_PATH`, run
   `CREATE TABLE IF NOT EXISTS items (...)` on module load/boot. No migration framework at this
   scale — this `IF NOT EXISTS` statement *is* the migration story.
3. Define the `Item` interface in `server/src/types.ts` with `category`/`location` typed as
   string literal unions (`'main' | 'side'`, `'fridge' | 'freezer'`) and `created_at`/`updated_at`
   typed as `string` (matches what `better-sqlite3` actually returns for a `DATETIME`-declared
   column — see Notes).
4. Duplicate the same interface in `src/types.ts` for the frontend to import.

## Verification

- `tsc -p server --noEmit` compiles `db.ts`/`types.ts` cleanly.
- Manually exercise `db.ts` (e.g. via `tsx server/src/db.ts` or a scratch script that imports it)
  against a throwaway `DB_PATH` and confirm the `items` table is created; inspect with
  `sqlite3 <path> ".schema items"`.

## Notes carried from the master plan

- **Enums enforced in the API layer, not via SQLite `CHECK`.** TypeScript union types here are
  compile-time only; the DB columns are plain `TEXT` with no runtime backstop. Every write path
  built in chunk 03 (`POST`, `PATCH`) must independently validate `category`/`location` — there's
  no DB-level safety net if a code path skips it.
- **`created_at`/`updated_at` declared as `DATETIME`,** not `TEXT`, per explicit instruction.
  SQLite has no dedicated datetime storage class — a `DATETIME`-declared column gets NUMERIC
  affinity, but `CURRENT_TIMESTAMP` still stores an ISO8601-style string
  (`YYYY-MM-DD HH:MM:SS`), so `better-sqlite3` reads it back as a plain string. The column type
  is there to communicate intent to tooling (a future ORM/DB browser), not to change runtime
  behavior — hence `string` in the TS interface, not `Date`.
