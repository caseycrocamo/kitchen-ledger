import { visibleItems, isLoading, loadError, loadItems, items } from '../state'
import { ItemCard } from './ItemCard'

const GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
const SKELETON_COUNT = 6

function SkeletonCard() {
  return (
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden animate-pulse">
      <div class="w-full h-36 bg-slate-200" />
      <div class="p-4 space-y-3">
        <div class="h-4 bg-slate-200 rounded w-3/4" />
        <div class="flex gap-2">
          <div class="h-4 bg-slate-200 rounded-full w-14" />
          <div class="h-4 bg-slate-200 rounded-full w-16" />
        </div>
        <div class="h-7 bg-slate-200 rounded w-full" />
      </div>
    </div>
  )
}

export function ItemList() {
  if (isLoading.value) {
    return (
      <div class={GRID_CLASS}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (loadError.value) {
    return (
      <div class="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
        <p class="text-red-700 font-medium">Couldn't load items</p>
        <p class="text-red-600 text-sm">{loadError.value}</p>
        <button
          type="button"
          onClick={() => loadItems()}
          class="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (visibleItems.value.length === 0) {
    const hasAnyItems = items.value.length > 0
    return (
      <div class="text-center py-16 text-slate-500">
        <p class="text-lg font-medium">
          {hasAnyItems ? 'No items match your filters' : 'No items yet'}
        </p>
        <p class="text-sm mt-1">
          {hasAnyItems
            ? 'Try adjusting your search or filters.'
            : "Add your first item to start tracking what's in your kitchen."}
        </p>
      </div>
    )
  }

  return (
    <div class={GRID_CLASS}>
      {visibleItems.value.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
