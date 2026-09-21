import { useState } from 'preact/hooks'
import type { Item } from '../types'
import { items } from '../state'
import { deleteItem, updateServings } from '../api'
import { ConfirmModal } from './ConfirmModal'
import { ACTION_WIDTH, useSwipeRow } from '../hooks/useSwipeRow'

interface ItemCardProps {
  item: Item
  onEdit: (item: Item) => void
}

const CATEGORY_LABEL: Record<Item['category'], string> = {
  main: 'Main',
  side: 'Side',
}

const LOCATION_LABEL: Record<Item['location'], string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function patchItem(id: number, patch: Partial<Item>): void {
  items.value = items.value.map((i) => (i.id === id ? { ...i, ...patch } : i))
}

export function ItemCard({ item, onEdit }: ItemCardProps) {
  const [pending, setPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { expanded, revealX, isSnapping, rowHandlers, handleHandlers, closeReveal, toggleReveal } =
    useSwipeRow()

  async function adjustServings(delta: number) {
    if (pending) return
    if (delta < 0 && item.servings <= 0) return

    const previousServings = item.servings
    patchItem(item.id, { servings: Math.max(0, previousServings + delta) })
    setPending(true)
    try {
      const result = await updateServings(item.id, delta)
      patchItem(item.id, { servings: result.servings })
    } catch {
      // Roll back the optimistic update on request failure.
      patchItem(item.id, { servings: previousServings })
    } finally {
      setPending(false)
    }
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await deleteItem(item.id)
      items.value = items.value.filter((i) => i.id !== item.id)
      setConfirmOpen(false)
    } catch {
      // Leave the modal open with the item intact so the user can retry or cancel.
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div class="relative overflow-hidden bg-white">
      <div class="absolute inset-y-0 right-0 flex" style={{ width: `${ACTION_WIDTH}px` }}>
        <button
          type="button"
          onClick={() => {
            closeReveal()
            onEdit(item)
          }}
          aria-label={`Edit ${item.name}`}
          class="w-18 h-full flex items-center justify-center bg-slate-600 text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.506l-3.03.867a.5.5 0 0 1-.618-.618l.867-3.03a2 2 0 0 1 .506-.878l8.5-8.5a2 2 0 0 1 .325-.325Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            closeReveal()
            setConfirmOpen(true)
          }}
          aria-label={`Delete ${item.name}`}
          class="w-18 h-full flex items-center justify-center bg-red-600 text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path
              fill-rule="evenodd"
              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4Zm-3.68 3.016a.75.75 0 1 0-1.497.084l.5 8.5a.75.75 0 1 0 1.496-.084l-.5-8.5Zm7.36 0a.75.75 0 0 0-1.497-.084l-.5 8.5a.75.75 0 1 0 1.497.084l.5-8.5Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div
        class={`relative bg-white ${isSnapping ? 'transition-transform duration-200 ease-out' : ''}`}
        style={{ transform: `translateX(${revealX}px)`, touchAction: 'none' }}
        onPointerDown={rowHandlers.onPointerDown}
        onPointerMove={rowHandlers.onPointerMove}
        onPointerUp={rowHandlers.onPointerUp}
        onPointerCancel={rowHandlers.onPointerUp}
      >
        <div class="min-h-16 flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            disabled={pending || item.servings <= 0}
            onClick={() => adjustServings(-1)}
            aria-label="Decrease servings"
            class="w-11 h-11 shrink-0 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &minus;
          </button>

          <span
            class="shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center tabular-nums"
            aria-label={`${item.servings} ${item.servings === 1 ? 'serving' : 'servings'}`}
          >
            {item.servings}
          </span>

          <span class="flex-1 break-words font-medium text-slate-900">{item.name}</span>

          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide details' : `Show details for ${item.name}`}
            class="hidden md:flex w-8 h-8 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
            style={{ touchAction: 'none' }}
            onPointerDown={handleHandlers.onPointerDown}
            onPointerMove={handleHandlers.onPointerMove}
            onPointerUp={handleHandlers.onPointerUp}
            onPointerCancel={handleHandlers.onPointerUp}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => adjustServings(1)}
            aria-label="Increase servings"
            class="w-11 h-11 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>

          <button
            type="button"
            aria-label={`Actions for ${item.name}`}
            onClick={toggleReveal}
            class="hidden md:flex w-6 h-8 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            ⋮
          </button>
        </div>

        {expanded && (
          <div class="px-3 pb-4 flex flex-col gap-3">
            <div class="flex gap-2 flex-wrap">
              <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {CATEGORY_LABEL[item.category]}
              </span>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                {LOCATION_LABEL[item.location]}
              </span>
            </div>
            {item.image_filename ? (
              <img
                src={`/api/uploads/${item.image_filename}`}
                alt={item.name}
                class="w-full h-40 rounded-lg object-cover bg-slate-100"
              />
            ) : (
              <div class="w-full h-40 rounded-lg bg-slate-100 flex items-center justify-center text-2xl font-semibold text-slate-400">
                {initials(item.name)}
              </div>
            )}
            <span class="text-sm text-slate-500">
              {item.servings} {item.servings === 1 ? 'serving' : 'servings'}
            </span>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Delete item?"
        message={`This will permanently remove "${item.name}" from your kitchen ledger.`}
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
