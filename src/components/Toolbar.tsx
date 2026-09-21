import { categoryFilter, locationFilter, searchQuery, sortBy, type SortOption } from '../state'
import type { Category, Location } from '../types'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'newest', label: 'Newest added' },
  { value: 'servings', label: 'Servings (high→low)' },
  { value: 'category', label: 'Category' },
  { value: 'location', label: 'Location' },
]

const CATEGORY_OPTIONS: { value: 'all' | Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'main', label: 'Main' },
  { value: 'side', label: 'Side' },
]

const LOCATION_OPTIONS: { value: 'all' | Location; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
]

function segmentClass(active: boolean) {
  return `px-3 py-2.5 min-h-11 text-sm ${
    active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
  }`
}

export function Toolbar() {
  return (
    <div class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={searchQuery.value}
        onInput={(e) => (searchQuery.value = (e.target as HTMLInputElement).value)}
        placeholder="Search items…"
        aria-label="Search items"
        class="w-full min-h-11 rounded-md border border-slate-300 px-3 py-2.5 text-sm sm:max-w-xs"
      />

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="Filter by category">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => (categoryFilter.value = opt.value)}
              class={segmentClass(categoryFilter.value === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div class="flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="Filter by location">
          {LOCATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => (locationFilter.value = opt.value)}
              class={segmentClass(locationFilter.value === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy.value}
          onChange={(e) => (sortBy.value = (e.target as HTMLSelectElement).value as SortOption)}
          aria-label="Sort items"
          class="rounded-md border border-slate-300 bg-white px-2 py-2.5 min-h-11 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
