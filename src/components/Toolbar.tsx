import { useState } from 'preact/hooks'
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
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount =
    (categoryFilter.value !== 'all' ? 1 : 0) + (locationFilter.value !== 'all' ? 1 : 0)

  return (
    <div class="rounded-lg border border-slate-200 bg-white p-4">
      <div class="flex items-center gap-2">
        <input
          type="search"
          value={searchQuery.value}
          onInput={(e) => (searchQuery.value = (e.target as HTMLInputElement).value)}
          placeholder="Search items…"
          aria-label="Search items"
          class="w-full min-h-11 rounded-md border border-slate-300 px-3 py-2.5 text-sm"
        />

        <button
          type="button"
          onClick={() => setFiltersOpen((prev) => !prev)}
          aria-expanded={filtersOpen}
          aria-label="Filter and sort"
          class={`relative shrink-0 min-h-11 flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${
            filtersOpen || activeFilterCount > 0
              ? 'border-slate-400 bg-slate-100 text-slate-700'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path
              fill-rule="evenodd"
              d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
              clip-rule="evenodd"
            />
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-500 text-white text-[10px] font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div class="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div class="flex overflow-hidden rounded-md border border-slate-300 self-start" role="group" aria-label="Filter by category">
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

          <div class="flex overflow-hidden rounded-md border border-slate-300 self-start" role="group" aria-label="Filter by location">
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

          <div class="relative self-start">
            <select
              value={sortBy.value}
              onChange={(e) => (sortBy.value = (e.target as HTMLSelectElement).value as SortOption)}
              aria-label="Sort items"
              class="appearance-none rounded-md border border-slate-300 bg-white pl-2 pr-8 py-2.5 min-h-11 text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
