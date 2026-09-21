import { signal, computed } from '@preact/signals'
import type { Item } from './types'
import { fetchItems } from './api'

export const items = signal<Item[]>([])
export const isLoading = signal(true)
export const loadError = signal<string | null>(null)

export const searchQuery = signal('')
export const categoryFilter = signal<'all' | 'main' | 'side'>('all')
export const locationFilter = signal<'all' | 'fridge' | 'freezer'>('all')
export const sortBy = signal<'name' | 'created_at'>('name')

// Full filter/sort logic lands in chunk 08 — pass-through of `items` for now.
export const visibleItems = computed<Item[]>(() => items.value)

export async function loadItems(): Promise<void> {
  isLoading.value = true
  loadError.value = null
  try {
    items.value = await fetchItems()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load items'
  } finally {
    isLoading.value = false
  }
}
