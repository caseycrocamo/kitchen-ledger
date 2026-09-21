import { computed, signal } from '@preact/signals'
import type { Item } from './types'
import { fetchItems } from './api'

export type CategoryFilter = 'all' | Item['category']
export type LocationFilter = 'all' | Item['location']
export type SortBy = 'name' | 'newest' | 'servings' | 'category' | 'location'

export const items = signal<Item[]>([])
export const loading = signal(false)
export const loadError = signal<string | null>(null)

export const searchQuery = signal('')
export const categoryFilter = signal<CategoryFilter>('all')
export const locationFilter = signal<LocationFilter>('all')
export const sortBy = signal<SortBy>('name')

// Full search/filter/sort logic lands in chunk 08 — pass-through for now.
export const visibleItems = computed<Item[]>(() => items.value)

export async function loadItems(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    items.value = await fetchItems()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load items'
  } finally {
    loading.value = false
  }
}
