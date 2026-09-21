// Stand-in for chunk 06's ItemCard — image/placeholder, badges, optimistic servings
// counter. Edit button is wired here (this chunk); delete stays inert until chunk 09.

import { items } from '../state'
import { updateServings } from '../api'
import type { Item } from '../types'

interface ItemCardProps {
  item: Item
  onEdit: (item: Item) => void
}

const CATEGORY_LABEL: Record<Item['category'], string> = { main: 'Main', side: 'Side' }
const LOCATION_LABEL: Record<Item['location'], string> = { fridge: 'Fridge', freezer: 'Freezer' }

export default function ItemCard({ item, onEdit }: ItemCardProps) {
  async function adjustServings(delta: number) {
    const previous = item.servings
    const optimistic = Math.max(0, previous + delta)
    items.value = items.value.map((i) => (i.id === item.id ? { ...i, servings: optimistic } : i))
    try {
      const { servings } = await updateServings(item.id, delta)
      items.value = items.value.map((i) => (i.id === item.id ? { ...i, servings } : i))
    } catch {
      items.value = items.value.map((i) => (i.id === item.id ? { ...i, servings: previous } : i))
    }
  }

  return (
    <div class="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="flex aspect-video items-center justify-center bg-slate-100">
        {item.image_filename ? (
          <img
            src={`/api/uploads/${item.image_filename}`}
            alt={item.name}
            class="h-full w-full object-cover"
          />
        ) : (
          <span class="text-2xl font-semibold text-slate-400">
            {item.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div class="flex flex-1 flex-col gap-2 p-3">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-medium text-slate-900">{item.name}</h3>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.name}`}
              class="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              ✎
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              disabled
              class="cursor-not-allowed rounded p-1 text-slate-300"
            >
              🗑
            </button>
          </div>
        </div>
        <div class="flex gap-2 text-xs">
          <span class="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
            {CATEGORY_LABEL[item.category]}
          </span>
          <span class="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">
            {LOCATION_LABEL[item.location]}
          </span>
        </div>
        <div class="mt-auto flex items-center justify-between pt-2">
          <span class="text-sm text-slate-600">Servings</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustServings(-1)}
              aria-label="Decrease servings"
              class="h-7 w-7 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              –
            </button>
            <span class="w-6 text-center font-medium">{item.servings}</span>
            <button
              type="button"
              onClick={() => adjustServings(1)}
              aria-label="Increase servings"
              class="h-7 w-7 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
