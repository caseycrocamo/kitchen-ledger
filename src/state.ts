import { computed, signal } from '@preact/signals'
import { fetchItems } from './api'
import type { Category, Item, Location } from './types'

export type SortOption = 'name' | 'newest' | 'servings' | 'category' | 'location'

export const items = signal<Item[]>([])
export const isLoading = signal(true)
export const loadError = signal<string | null>(null)

export const searchQuery = signal('')
export const categoryFilter = signal<'all' | Category>('all')
export const locationFilter = signal<'all' | Location>('all')
export const sortBy = signal<SortOption>('name')

export async function loadItems(): Promise<void> {
  isLoading.value = true
  loadError.value = null
  try {
    items.value = await fetchItems()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load items.'
  } finally {
    isLoading.value = false
  }
}

// Real filter/sort logic (chunk 08's deliverable).
export const visibleItems = computed<Item[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const category = categoryFilter.value
  const location = locationFilter.value

  const filtered = items.value.filter((item) => {
    if (query && !item.name.toLowerCase().includes(query)) return false
    if (category !== 'all' && item.category !== category) return false
    if (location !== 'all' && item.location !== location) return false
    return true
  })

  const sorted = [...filtered]
  switch (sortBy.value) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      break
    case 'newest':
      // created_at is "YYYY-MM-DD HH:MM:SS" (fixed-width, zero-padded) so a plain string
      // comparison sorts chronologically without needing Date parsing.
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
      break
    case 'servings':
      sorted.sort((a, b) => b.servings - a.servings)
      break
    case 'category':
      sorted.sort((a, b) => a.category.localeCompare(b.category))
      break
    case 'location':
      sorted.sort((a, b) => a.location.localeCompare(b.location))
      break
  }
  return sorted
})
