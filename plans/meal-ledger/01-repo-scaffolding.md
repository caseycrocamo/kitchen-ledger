# Chunk 01 — Repo scaffolding & tooling

Corresponds to master plan Phase 0, steps 1–3.

**Depends on:** nothing — first chunk.

## Files

- `package.json` *(modify)* — add `preact`, `@preact/signals` as dependencies; add
  `@preact/preset-vite` as a devDependency (current file has only vite/tailwind/typescript deps).
- `vite.config.ts` *(new)* — doesn't exist yet.
- `tsconfig.json` *(modify)* — add `"jsx": "react-jsx"` and `"jsxImportSource": "preact"` to
  `compilerOptions` (current file has neither).
- `server/package.json` *(new)*
- `server/tsconfig.json` *(new)*
- `.gitignore` *(modify)* — current file covers `node_modules`, `dist`, editor files; needs
  `server/node_modules`, `server/dist`, and the local SQLite/uploads data directory.
- `.dockerignore` *(modify)*

## Steps

1. Add `preact` and `@preact/signals` to `package.json` dependencies; add
   `@preact/preset-vite` to devDependencies.
2. Create `vite.config.ts`: import and register the preact plugin from
   `@preact/preset-vite`; add `server.proxy['/api'] = 'http://localhost:3001'` so `npm run dev`
   reaches the backend without CORS.
3. Update `tsconfig.json` `compilerOptions` with `"jsx": "react-jsx"` and
   `"jsxImportSource": "preact"`.
4. Create `server/` as an independent Node/TypeScript package (not an npm workspace — see
   Notes below): `server/package.json` with its own `name`/`scripts` (`build`: `tsc`, `dev`:
   watch via `tsx` or `ts-node-dev`) and deps (`express`, `better-sqlite3`, `multer`,
   `@types/express`, `@types/multer`, `typescript`); `server/tsconfig.json` targeting Node
   (`module`/`target` appropriate for Node 20, `outDir: "dist"`, `strict: true`).
5. Update `.gitignore` to add `server/node_modules`, `server/dist`, and the dev-mode data
   directory (e.g. `server/data/` for the SQLite file + uploads).
6. Update `.dockerignore` similarly so the frontend Docker build context doesn't pick up
   `server/`'s local artifacts (frontend and backend have separate Dockerfiles/build contexts —
   see chunk 04).

## Verification

- `npm install` succeeds at the root and in `server/`.
- `npm run dev` still boots Vite (app itself is unchanged until chunk 05 — this just confirms
  the config changes don't break the existing placeholder page).
- `npx tsc --noEmit` at the root passes (no `.tsx` files exist yet, so the new `jsx` settings
  are inert but shouldn't error).
- `npx tsc -p server --noEmit` passes on the empty `server/src/` (create a placeholder
  `server/src/index.ts` with just a comment if needed to confirm the config resolves — it will
  be replaced for real in chunk 03).

## Notes carried from the master plan

- **No shared frontend/backend package.** `server/` is deliberately a separate package (own
  `package.json`/`tsconfig.json`), not an npm workspace, to keep each container's build context
  and dependency tree independent. The `Item` type gets duplicated later (chunk 02) rather than
  shared — revisit only if the type surface grows.
