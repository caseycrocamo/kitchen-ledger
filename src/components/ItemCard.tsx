import { useState } from 'preact/hooks'
import { deleteItem, updateServings } from '../api'
import { items } from '../state'
import type { Item } from '../types'
import ConfirmModal from './ConfirmModal'

const CATEGORY_LABEL: Record<Item['category'], string> = {
  main: 'Main',
  side: 'Side',
}

const LOCATION_LABEL: Record<Item['location'], string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

export default function ItemCard({ item }: { item: Item }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [servingsError, setServingsError] = useState(false)

  function adjustServings(delta: number) {
    const previous = item.servings
    const next = Math.max(0, previous + delta)
    if (next === previous) return

    items.value = items.value.map((i) => (i.id === item.id ? { ...i, servings: next } : i))
    setServingsError(false)

    updateServings(item.id, delta).catch(() => {
      items.value = items.value.map((i) =>
        i.id === item.id ? { ...i, servings: previous } : i,
      )
      setServingsError(true)
    })
  }

  function handleDeleteConfirm() {
    setDeleting(true)
    deleteItem(item.id)
      .then(() => {
        items.value = items.value.filter((i) => i.id !== item.id)
        setConfirmOpen(false)
      })
      .catch(() => {
        // Leave the modal open with the item intact so the user can retry or cancel.
      })
      .finally(() => {
        setDeleting(false)
      })
  }

  return (
    <div class="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="flex h-36 items-center justify-center bg-slate-100">
        {item.image_filename ? (
          <img
            src={`/api/uploads/${item.image_filename}`}
            alt={item.name}
            class="h-full w-full object-cover"
          />
        ) : (
          <span class="text-3xl font-semibold text-slate-400">{initials(item.name) || '?'}</span>
        )}
      </div>

      <div class="flex flex-1 flex-col gap-2 p-4">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-medium text-slate-900">{item.name}</h3>
          <div class="flex gap-1">
            <button
              type="button"
              aria-label={`Edit ${item.name}`}
              class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✎
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => setConfirmOpen(true)}
            >
              🗑
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {CATEGORY_LABEL[item.category]}
          </span>
          <span class="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
            {LOCATION_LABEL[item.location]}
          </span>
        </div>

        <div class="mt-auto flex items-center justify-between pt-2">
          <span class="text-sm text-slate-500">Servings</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease servings"
              class="h-7 w-7 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
              onClick={() => adjustServings(-1)}
            >
              –
            </button>
            <span class="w-6 text-center font-medium text-slate-900">{item.servings}</span>
            <button
              type="button"
              aria-label="Increase servings"
              class="h-7 w-7 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
              onClick={() => adjustServings(1)}
            >
              +
            </button>
          </div>
        </div>
        {servingsError && (
          <p class="text-xs text-red-600">Couldn't save serving change — reverted.</p>
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
