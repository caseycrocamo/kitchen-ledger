# Chunk 09 — Delete flow

Corresponds to master plan Phase 8, step 23.

**Depends on:** [06-frontend-item-cards.md](06-frontend-item-cards.md) (`ItemCard`'s delete
button exists but is inert), [05-frontend-shell-state.md](05-frontend-shell-state.md)
(`deleteItem` in `src/api.ts`).

## Files

- `src/components/ConfirmModal.tsx` *(new)*
- `src/components/ItemCard.tsx` *(modify)* — wire the delete button to the confirm step.

## Steps

1. Build a small, reusable `src/components/ConfirmModal.tsx` — styled to match the app, not the
   native `confirm()`.
2. Wire `ItemCard`'s delete button to open `ConfirmModal`; on confirm, call `deleteItem` from
   `src/api.ts` and remove the item from the `items` signal; on cancel, close with no change.

## Verification

- Click delete on a card: confirm the custom modal appears (not a native browser `confirm()`
  dialog).
- Cancel: item remains in the list and in the backend (reload confirms it's still there).
- Confirm: item disappears from the list immediately and stays gone after a reload.
- Check the backend's uploads directory (or `docker compose exec api ls /app/data/uploads` if
  chunk 04 is deployed) and confirm the deleted item's image file was removed too, not orphaned
  — this is the API's job (chunk 03, `DELETE` route) but is only observable end-to-end from here.
