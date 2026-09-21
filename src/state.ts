// Stand-in for chunk 05's state.ts — signals + a pass-through `visibleItems`. Full
// filter/sort logic lands in chunk 08 (plans/meal-ledger/08-frontend-toolbar.md).

import { computed, signal } from '@preact/signals'
import { fetchItems } from './api'
import type { Item } from './types'

export const items = signal<Item[]>([])
export const itemsLoading = signal(true)
export const itemsError = signal<string | null>(null)

export type CategoryFilter = 'all' | 'main' | 'side'
export type LocationFilter = 'all' | 'fridge' | 'freezer'

export const searchQuery = signal('')
export const categoryFilter = signal<CategoryFilter>('all')
export const locationFilter = signal<LocationFilter>('all')
export const sortBy = signal<'name' | 'created_at'>('name')

// Pass-through until chunk 08 adds real search/filter/sort.
export const visibleItems = computed(() => items.value)

export async function loadItems(): Promise<void> {
  itemsLoading.value = true
  itemsError.value = null
  try {
    items.value = await fetchItems()
  } catch (err) {
    itemsError.value = err instanceof Error ? err.message : 'Failed to load items.'
  } finally {
    itemsLoading.value = false
  }
}
