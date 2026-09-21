import { updateServings } from '../api'
import { items } from '../state'
import type { Item } from '../types'

const CATEGORY_LABEL: Record<Item['category'], string> = { main: 'Main', side: 'Side' }
const LOCATION_LABEL: Record<Item['location'], string> = { fridge: 'Fridge', freezer: 'Freezer' }

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}

async function adjustServings(item: Item, delta: number) {
  const previous = item.servings
  const next = Math.max(0, previous + delta)
  if (next === previous) return

  items.value = items.value.map((i) => (i.id === item.id ? { ...i, servings: next } : i))

  try {
    await updateServings(item.id, delta)
  } catch {
    // Roll back the optimistic update on failure.
    items.value = items.value.map((i) => (i.id === item.id ? { ...i, servings: previous } : i))
  }
}

export function ItemCard({ item }: { item: Item }) {
  return (
    <div class="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="flex h-32 items-center justify-center bg-slate-100">
        {item.image_filename ? (
          <img
            src={`/api/uploads/${item.image_filename}`}
            alt={item.name}
            class="h-full w-full object-cover"
          />
        ) : (
          <span class="text-2xl font-semibold text-slate-400">{initials(item.name)}</span>
        )}
      </div>

      <div class="flex flex-1 flex-col gap-2 p-3">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-medium text-slate-900">{item.name}</h3>
          <div class="flex shrink-0 gap-1">
            {/* Wired up in chunk 07 (edit modal). */}
            <button type="button" aria-label="Edit item" class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              ✎
            </button>
            {/* Wired up in chunk 09 (delete confirm flow). */}
            <button type="button" aria-label="Delete item" class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600">
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
              onClick={() => adjustServings(item, -1)}
              class="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              –
            </button>
            <span class="w-4 text-center font-medium text-slate-900">{item.servings}</span>
            <button
              type="button"
              aria-label="Increase servings"
              onClick={() => adjustServings(item, 1)}
              class="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
