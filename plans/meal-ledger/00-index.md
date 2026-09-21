# Meal Ledger — Execution Plan Index

Source plan: [`plans/meal-ledger.md`](../meal-ledger.md). This directory chunks that plan into
10 independently-executable units, each scoped to a specific set of files, so work can be handed
off (to a session, an agent, or a future you) one chunk at a time instead of as one 25-step blob.

## Execution order & dependency graph

Backend and frontend scaffolding (chunks 01–02) can start in parallel once chunk 01 lands, but
everything downstream is otherwise a straight line — each chunk assumes the ones before it (per
its own **Depends on**) are done and working.

1. [01-repo-scaffolding.md](01-repo-scaffolding.md) — Preact/Vite tooling, `server/` package skeleton, ignore files
2. [02-backend-data-layer.md](02-backend-data-layer.md) — SQLite schema + shared `Item` types
3. [03-backend-api.md](03-backend-api.md) — Express routes, multer uploads, validation
4. [04-backend-containerization.md](04-backend-containerization.md) — `server/Dockerfile`, `docker-compose.yml`, nginx proxy
5. [05-frontend-shell-state.md](05-frontend-shell-state.md) — signals, fetch wrapper, Preact root render
6. [06-frontend-item-cards.md](06-frontend-item-cards.md) — `ItemCard`, `ItemList`, home page grid
7. [07-frontend-item-form.md](07-frontend-item-form.md) — add/edit modal, camera input
8. [08-frontend-toolbar.md](08-frontend-toolbar.md) — search/filter/sort
9. [09-frontend-delete-flow.md](09-frontend-delete-flow.md) — confirm modal + delete wiring
10. [10-verification.md](10-verification.md) — full manual + `docker compose` pass

```
01 ──┬──> 02 ──> 03 ──> 04
     └──> 05 ──> 06 ──┬──> 07
                       ├──> 08
                       └──> 09
                                └──> 10 (needs everything above)
```

Chunk 05 only needs 01 for tooling; it can be built before 03/04 exist, but you won't be able to
see live data until a backend (03, run locally or via 04) is up.

## Conventions used in every chunk file

- **Depends on** — which earlier chunks must be functionally complete first.
- **Files** — exact paths, marked `(new)` or `(modify)`.
- **Steps** — ordered, matching the granularity of the original plan's numbered steps (each note
  which original step(s) it corresponds to).
- **Verification** — checks scoped to *this chunk only*; the full cross-cutting verification pass
  lives in chunk 10.
- **Notes carried from the master plan** — only the Decisions/Further-Considerations bullets from
  `meal-ledger.md` that are relevant to that chunk's files, so each chunk is self-contained.

## Current repo state (baseline these chunks assume)

Static Vite + TypeScript + Tailwind scaffold, single Docker/nginx container, no backend:
- `package.json` — vite/tailwind/typescript only, no `preact`/`@preact/signals` yet.
- `tsconfig.json` — no `jsx`/`jsxImportSource` set.
- `src/main.ts` — placeholder `innerHTML` render, no components.
- `nginx.conf` — single `location /` block, no `/api/` proxy.
- `Dockerfile` — single-stage build → nginx, no second service.
- No `server/` directory, no `docker-compose.yml`.
