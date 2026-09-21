import { useState } from 'preact/hooks'
import type { Item } from '../types'
import { items } from '../state'
import { updateServings } from '../api'

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

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {item.image_filename ? (
        <img
          src={`/api/uploads/${item.image_filename}`}
          alt={item.name}
          class="w-full h-36 object-cover bg-slate-100"
        />
      ) : (
        <div class="w-full h-36 bg-slate-100 flex items-center justify-center text-2xl font-semibold text-slate-400">
          {initials(item.name)}
        </div>
      )}

      <div class="p-4 flex flex-col gap-3 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-slate-900 leading-tight break-words">{item.name}</h3>
          <div class="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.name}`}
              class="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.506l-3.03.867a.5.5 0 0 1-.618-.618l.867-3.03a2 2 0 0 1 .506-.878l8.5-8.5a2 2 0 0 1 .325-.325Z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              class="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path
                  fill-rule="evenodd"
                  d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4Zm-3.68 3.016a.75.75 0 1 0-1.497.084l.5 8.5a.75.75 0 1 0 1.496-.084l-.5-8.5Zm7.36 0a.75.75 0 0 0-1.497-.084l-.5 8.5a.75.75 0 1 0 1.497.084l.5-8.5Z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex gap-2 flex-wrap">
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {CATEGORY_LABEL[item.category]}
          </span>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
            {LOCATION_LABEL[item.location]}
          </span>
        </div>

        <div class="mt-auto flex items-center justify-between pt-2">
          <span class="text-sm text-slate-500">Servings</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              disabled={pending || item.servings <= 0}
              onClick={() => adjustServings(-1)}
              aria-label="Decrease servings"
              class="w-7 h-7 rounded-full border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &minus;
            </button>
            <span class="w-6 text-center font-medium text-slate-900 tabular-nums">{item.servings}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => adjustServings(1)}
              aria-label="Increase servings"
              class="w-7 h-7 rounded-full border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
