import { visibleItems, isLoading, loadError, loadItems, items } from '../state'
import { ItemCard } from './ItemCard'
import type { Item } from '../types'

interface ItemListProps {
  onEdit: (item: Item) => void
}

const LIST_CLASS =
  'max-w-2xl mx-auto flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden'
const SKELETON_COUNT = 6

function SkeletonRow() {
  return (
    <div class="h-16 flex items-center gap-3 px-3 animate-pulse">
      <div class="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
      <div class="flex-1 h-4 bg-slate-200 rounded" />
      <div class="w-8 h-8 rounded bg-slate-200 shrink-0" />
      <div class="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
    </div>
  )
}

export function ItemList({ onEdit }: ItemListProps) {
  if (isLoading.value) {
    return (
      <div class={LIST_CLASS}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <SkeletonRow key={i} />
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
      <div class="max-w-2xl mx-auto text-center py-16 text-slate-500">
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
    <div class={LIST_CLASS}>
      {visibleItems.value.map((item) => (
        <ItemCard key={item.id} item={item} onEdit={onEdit} />
      ))}
    </div>
  )
}
