import { error, items, loadItems, loading, visibleItems } from '../state'
import { ItemCard } from './ItemCard'

export function ItemList() {
  if (loading.value) {
    return (
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} class="h-56 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    )
  }

  if (error.value) {
    return (
      <div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p class="mb-3 text-red-700">{error.value}</p>
        <button
          type="button"
          onClick={() => loadItems()}
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (visibleItems.value.length === 0) {
    return (
      <div class="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
        {items.value.length === 0
          ? "No items yet — add your first item to get started."
          : 'No items match your search or filters.'}
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
