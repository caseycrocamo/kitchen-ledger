# Kitchen Ledger — v2 Mobile-First Redesign Plan

## TL;DR

Redesign the item list from a multi-column card grid into a **mobile-first, single-row list** styled with Tailwind. Each item collapses to one row — `− button · picture · name · + button` — with two gesture-revealed layers: swiping (or dragging) **down** expands the row to show the item's full detail (image, category/location badges, servings count); swiping **left** reveals **Edit**/**Delete** action buttons, matching the iOS-Mail/Gmail swipe-action pattern. The redundant subtitle under the page `<h1>` is removed. Since there's no gesture library in the project (`package.json`), gestures are hand-rolled with Pointer Events (works for touch *and* mouse, so it's testable in a desktop browser too) rather than adding a dependency.

Recommended defaults locked in with you already:
- The servings count is **not** hidden entirely — it shows as a small badge overlaid on the thumbnail in the collapsed row, in addition to being spelled out in the expanded panel.
- Small always-visible fallback icons (a chevron, a kebab/dots) sit in the row so the card is usable without touch (mouse/keyboard), alongside the swipe gestures.
- Each row's expanded/revealed state is independent — opening one row doesn't auto-close others.

## Steps

### Phase 1 — Remove the redundant page description

1. In [src/App.tsx](src/App.tsx:23), delete the `<p class="text-sm text-slate-500">Track what's in your kitchen.</p>` line under the `<h1>`. Keep the header's flex layout; just drop the empty vertical space it leaves (e.g. let the `<h1>` sit alone in its wrapping `<div>`, or drop the wrapping `<div>` entirely and put `<h1>` directly in the flex row).

### Phase 2 — Gesture primitive

2. Add `src/hooks/useSwipeRow.ts`, a small Preact hook encapsulating the row's two independent gesture states so `ItemCard` stays declarative:
   - `expanded: boolean` — toggled by (a) tapping the chevron affordance, or (b) a vertical drag on a dedicated **handle** zone (see Decisions — the handle, not the whole row, owns the vertical drag, to avoid fighting native page scroll).
   - `revealX: number` (0 to `-ACTION_WIDTH`) — driven by a horizontal Pointer Events drag anywhere on the row's foreground content, clamped between `0` (closed) and `-ACTION_WIDTH` (fully revealing the Edit/Delete buttons), with light overscroll resistance past either end and a CSS-transition snap to the nearer end on release (or when the drag distance/velocity crosses a threshold, snap to the far end instead — standard swipe-to-reveal easing).
   - Exposes `{ expanded, toggleExpanded, revealX, rowHandlers (onPointerDown/Move/Up for the horizontal swipe), handleHandlers (onPointerDown/Move/Up for the vertical expand drag), closeReveal }`.
   - On the horizontal drag: since `revealX` only ever needs to change while a pointer is captured on the row, use `setPointerCapture` on pointerdown so drags that leave the row's bounding box still track correctly.
   - Treat small movements (under ~8px) as a tap/click rather than a drag — don't intercept `pointerdown`'s effect on native `<button>` children (the −/+ buttons) when the gesture never crosses that threshold, so tapping − or + still fires their own `onClick` normally.
   - Clicking anywhere else while `revealX !== 0` should call `closeReveal()` instead of the row's normal tap behavior (matches iOS list behavior — first tap on an open row just closes it).

### Phase 3 — Redesign `ItemCard` as a swipeable single row

3. Rewrite [src/components/ItemCard.tsx](src/components/ItemCard.tsx) around three stacked layers inside a `relative overflow-hidden` wrapper:
   - **Action layer** (behind, `absolute inset-y-0 right-0 flex`): Edit and Delete buttons, each a fixed-width (e.g. `w-18`) full-height flex-centered tap target (≥44px tall, well over Apple/Material minimums since the whole row is already touch-sized), Edit in `bg-slate-600`/white icon, Delete in `bg-red-600`/white icon, reusing the existing SVGs and `onEdit`/`setConfirmOpen` handlers from the current implementation. Total width = `ACTION_WIDTH` from the hook.
   - **Foreground layer** (`translateX(revealX)`, `bg-white`, transition on release): the collapsed row plus the expandable detail panel stacked vertically.
     - **Collapsed row** (fixed height, e.g. `h-16`, `flex items-center gap-3 px-3`), left to right exactly as specified:
       1. `−` button — same circular button and `adjustServings(-1)` logic as today, sized up for a thumb (e.g. `w-11 h-11` instead of `w-7 h-7`), disabled at 0 servings.
       2. Picture — `w-11 h-11 rounded-full` thumbnail (photo or `initials()` fallback, same as today), with the servings count overlaid as a small pill badge (`absolute -bottom-1 -right-1`, `bg-slate-900 text-white text-[10px] rounded-full px-1.5`) anchored to the thumbnail's wrapping `relative` div.
       3. Name — `flex-1 truncate font-medium text-slate-900`.
       4. Small chevron button (fallback + drag handle from Phase 2, `aria-expanded={expanded}`, `aria-label="Show details for {name}"` / `"Hide details"`) — placed just before the `+` button, small and visually secondary (e.g. `text-slate-400`, `w-8 h-8`) so it doesn't compete with the four primary elements.
       5. `+` button — same as today, sized up to `w-11 h-11`.
       6. A tiny kebab affordance (`⋮`, `aria-label="Actions for {name}"`) at the very right edge of the row that calls the same `toggleReveal`/open-to-`-ACTION_WIDTH` behavior as a left swipe, giving mouse/keyboard users a way to reach Edit/Delete without dragging.
     - **Expanded panel** (rendered only when `expanded`, or height-animated via a `grid-rows-[0fr]`/`grid-rows-[1fr]` transition if you want it animated rather than instant): reuses the content the v1 card used to show up front — full category badge (`CATEGORY_LABEL`) and location badge (`LOCATION_LABEL`), a larger/full-width image (or initials block) if there's room, and the numeric servings count spelled out (`"3 servings"`) since the collapsed badge is intentionally small.
   - Keep all existing state/logic as-is: `pending`, `adjustServings`, `confirmOpen`, `deleting`, `handleDeleteConfirm`, and the `ConfirmModal` at the bottom — only the surrounding markup/layout and the two new pieces of gesture state change.
   - Wire `useSwipeRow`'s `rowHandlers` onto the foreground layer's outer div, and `handleHandlers` onto the chevron button specifically (per the Decisions below, the drag-to-expand hit zone is scoped to the chevron/handle, not the full row).

### Phase 4 — List layout

4. Update [src/components/ItemList.tsx](src/components/ItemList.tsx): replace `GRID_CLASS` (currently a 1/2/3-column card grid) with a single-column stacked list — e.g. `flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden`, capped with a `max-w-2xl mx-auto` wrapper so it doesn't stretch edge-to-edge on wide screens (see Decisions — thin rows don't benefit from a multi-column grid the way taller cards did).
5. Redesign `SkeletonCard` into a thin skeleton **row** matching the new `h-16` row height (circle placeholder, name bar, two small button-shaped placeholders) instead of the old tall image-card skeleton.
6. Empty-state and error-state blocks (`visibleItems.value.length === 0`, `loadError.value`) keep their current copy/logic; only re-check their padding/centering still reads fine inside the narrower `max-w-2xl` list wrapper.

### Phase 5 — Mobile-first pass on the rest of the UI

7. In [src/App.tsx](src/App.tsx), bump the header's "+ Add item" button to a clearly-thumb-sized tap target (min height ~44px, e.g. `py-2.5 px-4`) since the header now has more visual weight after the subtitle is removed.
8. In [src/components/Toolbar.tsx](src/components/Toolbar.tsx), increase the segmented filter buttons', search input's, and sort `<select>`'s vertical padding/min-height to ≥44px (currently `py-1.5`/`py-2`, a bit tight for a thumb), and confirm the toolbar's `flex-col`→`sm:flex-row` stacking still reads well now that it sits above a narrower single-column list.
9. In [src/components/ItemFormModal.tsx](src/components/ItemFormModal.tsx) and [src/components/ConfirmModal.tsx](src/components/ConfirmModal.tsx), bump the Cancel/Save/Confirm/Delete buttons' padding to match the ≥44px touch-target bar used elsewhere (currently `py-2`, close but worth normalizing), and double check the file-input row's tap targets (the native file `<input>` and the "Remove image" text link).

### Phase 6 — Verification pass

10. Run `npm run build` (`tsc && vite build`) to confirm the TypeScript rewrite of `ItemCard.tsx`/new hook type-checks cleanly.
11. Run the dev server (`npm run dev`) and drive it through the built-in browser tool: emulate a mobile viewport (`resize_window` preset `mobile`), confirm the row order and sizing, and confirm the subtitle is gone.
12. Because `useSwipeRow` is built on Pointer Events (not touch-only), exercise both gestures with mouse drags in the browser tool: `left_click_drag` leftward across a row to confirm Edit/Delete reveal and snap-back, and a drag on the chevron handle (down then up) to confirm expand/collapse. Confirm tapping − / + still works without triggering a drag, and that a stray tap on an open (revealed) row closes it instead of acting on the row.
13. Confirm existing functional flows are unaffected: add item, edit item (pre-filled form), delete via the confirm modal, servings optimistic update + rollback on failure, and the Toolbar's search/filter/sort against the new list layout.

## Relevant Files

- [src/App.tsx](src/App.tsx) — remove subtitle; bump Add-item button sizing.
- [src/components/ItemCard.tsx](src/components/ItemCard.tsx) — full rewrite of markup/layout; reuses `adjustServings`, `patchItem`, `handleDeleteConfirm`, `CATEGORY_LABEL`, `LOCATION_LABEL`, `initials()` as-is.
- [src/components/ItemList.tsx](src/components/ItemList.tsx) — grid → single-column list; redesign `SkeletonCard`.
- [src/components/Toolbar.tsx](src/components/Toolbar.tsx) — touch-target sizing pass only, no structural change.
- [src/components/ItemFormModal.tsx](src/components/ItemFormModal.tsx) / [src/components/ConfirmModal.tsx](src/components/ConfirmModal.tsx) — touch-target sizing pass only.
- `src/hooks/useSwipeRow.ts` (new) — Pointer Events gesture hook shared by nothing else yet, but kept separate from `ItemCard.tsx` so the component stays readable.
- [src/state.ts](src/state.ts), [src/api.ts](src/api.ts), [src/types.ts](src/types.ts) — no changes expected; v2 is presentation-only.

## Verification

- `npm run build` passes (type-checks the new hook and rewritten component).
- Manual pass in the browser tool at a mobile viewport width: row order matches `− / picture / name / +`, servings badge visible on the thumbnail, subtitle gone.
- Mouse-drag swipe-left reveals Edit/Delete and snaps closed on release near the start; kebab tap does the same without dragging.
- Chevron drag/tap expands the row to show badges + full servings count; toggling again collapses it.
- Tapping − / + still adjusts servings optimistically (and rolls back if you can force an API failure, e.g. stop the backend).
- Add/Edit/Delete flows and Toolbar search/filter/sort still work end-to-end against the new list.

## Decisions

- **Gestures are hand-rolled with Pointer Events**, not a new dependency — the project intentionally keeps frontend deps minimal (`preact` + `@preact/signals` only), and Pointer Events cover touch, mouse, and pen uniformly, which also makes the redesign testable via mouse in a normal browser.
- **The vertical "swipe down to expand" drag is scoped to the chevron/handle element, not the entire row.** A whole-row vertical drag would fight the browser's native page-scroll gesture — both start as "finger moves down" — and there's no reliable way to distinguish "scroll the list" from "expand this row" from the first few pixels of movement alone. Scoping the drag to a small dedicated handle (which is also the tap-fallback chevron) sidesteps the conflict entirely: touching anywhere else on the row scrolls the page normally via native `touch-action: pan-y`, and only the handle's small hit-zone uses `touch-action: none` to capture vertical drags. This is flagged explicitly since it's a narrower interpretation of "swiping down" than "swipe down anywhere on the card" — see Further Considerations if you want the larger hit-zone despite the scroll-jank risk.
- **Horizontal swipe-to-reveal runs on the whole row's foreground layer**, since horizontal drags don't compete with the page's vertical scroll — this one doesn't need the handle-scoping treatment.
- **List layout switches from a 1/2/3-column card grid to a single-column stacked list** (`divide-y` rows capped at `max-w-2xl`). Thin single-row cards read as a list, not a card grid, and multi-column would add complexity to the swipe-reveal absolute-positioning math (each column's rows would need independent action-layer widths) without a clear payoff at this row height.
- **Servings count**: shown as a small badge on the thumbnail in the collapsed row (not fully hidden, per your answer) and spelled out again in the expanded panel for clarity.
- **Fallback affordances**: a chevron (expand) and a kebab (actions) are always visible in the row, per your answer, so the redesign doesn't regress desktop/mouse/keyboard usability even though the primary interaction is touch.
- **Per-row independent state**: no shared "only one row open" bookkeeping in `ItemList`/`state.ts` — matches your answer and keeps `ItemCard` self-contained like it is today.

## Further Considerations

- **Whole-row swipe-down, accepting scroll jank**: if literal "swipe down anywhere on the card" matters more than smooth list scrolling, the handle-scoping in Phase 2/3 can be relaxed to a gesture-angle heuristic on the full row (lock to vertical-drag mode once `|dy| > |dx|` past an 8px threshold, `preventDefault()` to suppress native scroll for that gesture). Recommend keeping the handle-scoped version first and only revisiting this if it feels too restrictive in practice.
- **Expanded-panel animation**: the plan allows either an instant show/hide or a `grid-rows` height transition for the expand panel. Recommend starting with the CSS grid-rows technique (`transition-[grid-template-rows]`) since it's the standard trick for animating to `auto` height in pure CSS — flag if you'd rather keep it instant/simple for now.
- **Two-open-gestures-at-once**: nothing in the plan prevents a row from being both `expanded` and swiped-left simultaneously (e.g. detail panel showing while Edit/Delete are revealed). This seems fine visually (they occupy different axes) but worth a quick look once built — if it looks cluttered, closing the reveal on expand (and vice versa) is a small, localized change to `useSwipeRow`.
