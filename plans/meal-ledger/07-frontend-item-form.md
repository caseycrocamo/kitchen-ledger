# Chunk 07 — Add/edit item form

Corresponds to master plan Phase 6, steps 19–20.

**Depends on:** [06-frontend-item-cards.md](06-frontend-item-cards.md) (edit button on
`ItemCard` to wire up), [05-frontend-shell-state.md](05-frontend-shell-state.md) (`createItem`/
`updateItem` in `src/api.ts`).

## Files

- `src/components/ItemFormModal.tsx` *(new)*
- `src/App.tsx` *(modify)* — add-item button, modal open/mode state.
- `src/components/ItemCard.tsx` *(modify)* — wire the (already-rendered, inert since chunk 06)
  edit button to open the modal pre-filled.

## Steps

1. Build `src/components/ItemFormModal.tsx`, shared between add and edit flows: name text
   input, category select (Main/Side), location select (Fridge/Freezer), servings number input
   (default 1, min 0), and the camera/file input:
   `<input type="file" accept="image/*" capture="environment">` with a thumbnail preview of the
   selected (or, in edit mode, existing) image, plus a "remove image" option when editing.
2. Wire a floating/header "Add item" button in `src/App.tsx` that opens the modal in create
   mode.
3. Wire `ItemCard`'s edit button to open the modal in edit mode, pre-filled from that item.
4. On submit: call `createItem`/`updateItem` from `src/api.ts`, update the `items` signal with
   the server response, close the modal. Surface inline validation errors returned by the API
   (e.g. empty name → the API's `400`).

## Verification

- Add an item with a photo, and one without.
- On a phone (or a mobile-emulated browser), confirm the file input opens the camera directly
  via `capture="environment"` rather than a generic file picker.
- Edit an existing item's name, category, location, and servings independently.
- Replace an image on an existing item; then remove an image without replacing it.
- Submit with an empty name and confirm the inline error from the API surfaces in the modal
  rather than failing silently.

## Notes carried from the master plan

- **Native file/camera input** (`capture="environment"`) over a custom `getUserMedia` view —
  far less code, and it works as a plain file picker on desktop too.
- **Image compression** is out of scope for this chunk — the API (chunk 03) caps upload size at
  ~8MB but nothing resizes/compresses client-side. Flag to the user if phone-camera file sizes
  become a storage/load-time problem; a canvas-resize-before-upload step would be the fix.
