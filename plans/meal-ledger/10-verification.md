# Chunk 10 — End-to-end verification pass

Corresponds to master plan Phase 9, steps 24–25.

**Depends on:** all of chunks 01–09 complete. This chunk touches no new files — it's a testing
pass across the whole app, matching the master plan's own Verification section.

## Steps / checks

**Manual browser pass (dev mode, backend running locally):**
1. Add an item with an image; add one without an image.
2. Edit name, category, location, and servings independently on an existing item.
3. Replace an image on an item; remove an image without replacing it.
4. Increment/decrement servings, including confirming it clamps at 0 (not negative) under rapid
   clicking.
5. Delete an item via the confirm modal.
6. Search by partial name (case-insensitive).
7. Filter by every category/location combination, including `'all'`/`'all'`.
8. Sort by every option (Name A–Z, Newest added, Servings high→low, Category, Location).
9. Reload the page after all of the above and confirm everything persisted — proves data is
   coming from the backend, not held only in in-memory signal state.

**Build/type-check:**
10. `npm run build` (frontend) type-checks and builds cleanly.
11. `tsc -p server` (backend) type-checks cleanly.

**Mobile check:**
12. On an actual phone, or a mobile-emulated browser, confirm the file input in the add/edit
    modal opens the camera directly via `capture="environment"`.

**`docker compose` pass:**
13. `docker compose up --build`: confirm the site loads on the mapped port.
14. Confirm add/edit/delete/image-upload all work through the nginx `/api/` proxy (not just
    against the Vite dev proxy).
15. Restart the `api` container (`docker compose restart api`) and confirm both the item data
    and uploaded images persisted via the named volume.
16. Re-run the rapid-decrement servings check against the containerized stack specifically —
    confirms the SQL clamp holds under the real deployment, not just `ts-node`/`tsx` dev mode.
17. Delete an item against the containerized stack and confirm its image file is actually gone
    from the named volume: `docker compose exec api ls /app/data/uploads` before/after.

## If something fails

Trace the failure back to the owning chunk (01–09) rather than patching around it here — this
chunk is verification-only and shouldn't need its own code changes. If a check reveals a gap the
master plan didn't anticipate, note it against the relevant chunk file and flag it to the user
before changing scope.
