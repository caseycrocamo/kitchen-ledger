// Stand-in for chunk 06's ItemList — responsive grid, loading skeleton, error banner
// with retry, empty state.

import { itemsError, itemsLoading, loadItems, visibleItems } from '../state'
import ItemCard from './ItemCard'
import type { Item } from '../types'

interface ItemListProps {
  onEdit: (item: Item) => void
}

export default function ItemList({ onEdit }: ItemListProps) {
  if (itemsLoading.value) {
    return (
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} class="h-48 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    )
  }

  if (itemsError.value) {
    return (
      <div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p class="mb-3 text-red-700">{itemsError.value}</p>
        <button
          type="button"
          onClick={() => loadItems()}
          class="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (visibleItems.value.length === 0) {
    return (
      <div class="py-16 text-center text-slate-500">
        No items yet. Add your first item to get started.
      </div>
    )
  }

  return (
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.value.map((item) => (
        <ItemCard key={item.id} item={item} onEdit={onEdit} />
      ))}
    </div>
  )
}
