# Chunk 01 — Repo scaffolding & tooling — Completion Summary

## What was built

- `package.json`: added `preact` (^10.29.8), `@preact/signals` (^2.11.2) as
  dependencies; added `@preact/preset-vite` (^2.10.6) as a devDependency.
- `vite.config.ts` (new): registers the `@preact/preset-vite` plugin and sets
  `server.proxy['/api'] = 'http://localhost:3001'`.
- `tsconfig.json`: added `"jsx": "react-jsx"` and `"jsxImportSource": "preact"`
  to `compilerOptions`.
- `server/package.json` (new): independent package (`kitchen-ledger-server`,
  ESM, `type: module`), scripts `dev` (`tsx watch src/index.ts`), `build`
  (`tsc`), `start` (`node dist/index.js`). Deps: `express`, `better-sqlite3`,
  `multer`. DevDeps: `@types/express`, `@types/better-sqlite3`,
  `@types/multer`, `tsx`, `typescript`.
- `server/tsconfig.json` (new): Node-20-appropriate config
  (`target`/`module`/`moduleResolution`: ES2023/nodenext, `outDir: "dist"`,
  `rootDir: "src"`, `strict: true`).
- `server/src/index.ts` (new, placeholder): empty entry point with a comment,
  just so `server/tsconfig.json` has something to resolve; will be replaced
  for real in chunk 03.
- `.gitignore`: added `server/node_modules`, `server/dist`, `server/data`.
- `.dockerignore`: added the same three entries so the frontend Docker build
  context doesn't pick up backend artifacts.

## Deviations and why

- **`better-sqlite3` pinned to `^12.11.1` instead of latest (`^13.0.3`).**
  The master plan (chunk 04 / master spec step 10) specifies the backend
  Docker runtime as `node:20-slim`, and this repo's dev tooling also targets
  Node 20 (per the env gotcha: system `node` is v14, project tooling runs on
  the v20.20.2 install). `better-sqlite3@13.x` declares an engines
  requirement of `node >=22` and emits an `EBADENGINE` warning under Node 20
  (native prebuild mismatch risk). `12.11.1` declares
  `"node": "20.x || 22.x || 23.x || 24.x || 25.x || 26.x"` and installs
  cleanly with no engine warnings. Flagging for chunk 04's implementer
  (Dockerfile) and chunk 02's implementer (data layer) in case they pin a
  different version — this choice keeps `server/`'s native module aligned
  with the Node 20 runtime the whole plan assumes.
- **`server/package.json` set to `"type": "module"`** to match the root
  package's ESM style and `server/tsconfig.json`'s `module`/`moduleResolution:
  nodenext`. Not explicitly specified in the chunk file, but consistent with
  the root config and avoids CJS/ESM interop friction for chunk 03's Express
  app.
- Everything else matches the chunk spec as written — no other deviations.

## Verification results

`npm install` at root:
```
added 107 packages, and audited 108 packages in 2s
found 0 vulnerabilities
```

`npm install` in `server/` (after pinning `better-sqlite3` to `^12.11.1`):
```
added 128 packages, and audited 129 packages in 24s
found 0 vulnerabilities
```
(No `EBADENGINE` warning — confirmed clean on Node 20.20.2.)

`npm run dev` (root, Vite):
```
> kitchen-ledger@0.0.0 dev
> vite

  VITE v8.3.0  ready in 994 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```
Confirmed `curl http://localhost:5173/` → `200`. Placeholder page still
renders; preact/proxy config changes are inert until chunk 05.

`npx tsc --noEmit` at root: passes, no output (exit 0).

`npx tsc -p server --noEmit`: passes, no output (exit 0).

All four verification checks from the chunk spec pass.
