# Chunk 05 — Frontend app shell & state — Completion Summary

## What was built (this chunk's own files)

- `src/state.ts` — `items` (`Signal<Item[]>`), `loading`, `loadError` signals; `searchQuery`,
  `categoryFilter` (`'all'|'main'|'side'`), `locationFilter` (`'all'|'fridge'|'freezer'`),
  `sortBy` signals; `visibleItems` computed as a pass-through of `items` (full filter/sort logic
  deferred to chunk 08 per spec); `loadItems()` async function that fetches into `items` and
  catches failures into `loadError` rather than throwing.
- `src/api.ts` — thin fetch wrappers: `fetchItems`, `createItem`, `updateItem`, `updateServings`,
  `deleteItem`. `createItem`/`updateItem` build `FormData` (including optional `image` File and
  `removeImage` flag for updates); `updateServings` sends JSON `{ delta }`. Shared `request<T>`
  helper throws on non-OK responses and safely handles empty/204 bodies (relevant for `DELETE`).
- `src/main.ts` — replaced the placeholder `innerHTML` block with
  `render(h(App, {}), document.getElementById('app')!)`. Kept as `.ts` (not renamed to `.tsx` per
  the plan's file list) — uses `h()` from `preact` directly instead of JSX syntax.
- `src/App.tsx` — root component; calls `loadItems()` on mount via `useEffect`, renders the
  existing "Kitchen Ledger / Track what's in your kitchen" header plus a loading state, an error
  banner on fetch failure, and an item count once loaded.

## Chunk 01/02 stand-ins created (dependencies not yet in this worktree)

This worktree only had the baseline static Vite scaffold — chunks 01/02 hadn't landed here (other
agents are building them in parallel worktrees). Created minimal, spec-matching stand-ins so this
chunk is renderable/testable on its own:

- `package.json` — added `preact@^10.29.8`, `@preact/signals@^2.11.2` to `dependencies`;
  `@preact/preset-vite@^2.10.6` to `devDependencies` (versions resolved from npm registry at
  implementation time; peer-compatible with Vite 8).
- `vite.config.ts` *(new)* — registers the `@preact/preset-vite` plugin; `server.proxy['/api']`
  → `http://localhost:3001`.
- `tsconfig.json` — added `"jsx": "react-jsx"` and `"jsxImportSource": "preact"` to
  `compilerOptions`.
- `src/types.ts` *(new)* — `Item` interface: `id`, `name`, `category: 'main'|'side'`,
  `location: 'fridge'|'freezer'`, `servings`, `image_filename: string | null`, `created_at`,
  `updated_at` (both `string`), matching chunk 02's spec.

Not built (out of scope for this chunk, per instructions): any `server/` package/backend code.

## Deviations from spec

None substantive. `main.ts` uses `h(App, {})` instead of JSX `<App />` since the file stays a
`.ts` file (not `.tsx`) per the plan's explicit file list — functionally identical to
`render(<App />, ...)`.

## Verification results

- `npm install` — succeeds, 0 vulnerabilities.
- `npx tsc --noEmit` — passes cleanly.
- `npm run build` (`tsc && vite build`) — succeeds; build output removed after the check (dist is
  gitignored).
- `npm run dev` (port 5183, backend not running) — loaded in-browser via the Claude Browser tool:
  - Page renders "Kitchen Ledger" shell, no blank screen, Tailwind styles applied.
  - Console: only a single `[error] Failed to load resource: 502` (the proxied `/api/items`
    network response) — no JS/application exceptions, no uncaught errors.
  - `App` displays "Couldn't load items: Request failed: 502 Bad Gateway" instead of crashing —
    confirms the fetch failure is caught (`loadError` signal) and the app stays interactive.
  - Verified via screenshot + `read_console_messages` + `read_network_requests`.
- Dev server was stopped after verification.
