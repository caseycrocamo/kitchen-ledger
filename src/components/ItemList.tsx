import { loadItems } from '../App'
import { itemsError, itemsLoading, visibleItems } from '../state'
import ItemCard from './ItemCard'

export default function ItemList() {
  if (itemsLoading.value) {
    return (
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} class="h-64 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    )
  }

  if (itemsError.value) {
    return (
      <div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p class="text-sm text-red-700">{itemsError.value}</p>
        <button
          type="button"
          class="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          onClick={loadItems}
        >
          Retry
        </button>
      </div>
    )
  }

  if (visibleItems.value.length === 0) {
    return (
      <div class="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <p class="text-slate-500">No items yet. Add something to your kitchen to get started.</p>
      </div>
    )
  }

  return (
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.value.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
