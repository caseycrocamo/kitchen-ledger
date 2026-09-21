import { computed, signal } from '@preact/signals'
import { fetchItems, fetchTags } from './api'
import type { Item } from './types'

export type SortOption = 'name' | 'newest' | 'servings'

export const items = signal<Item[]>([])
export const isLoading = signal(true)
export const loadError = signal<string | null>(null)

export const allTags = signal<string[]>([])

export const searchQuery = signal('')
export const tagFilter = signal<string[]>([])
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

export async function loadTags(): Promise<void> {
  try {
    const tags = await fetchTags()
    allTags.value = tags.map((tag) => tag.name)
  } catch {
    // Non-critical — the tag filter/autocomplete just stays empty.
  }
}

// Real filter/sort logic (chunk 08's deliverable).
export const visibleItems = computed<Item[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const tags = tagFilter.value

  const filtered = items.value.filter((item) => {
    if (query && !item.name.toLowerCase().includes(query)) return false
    if (
      tags.length > 0 &&
      !tags.every((t) => item.tags.some((it) => it.toLowerCase() === t.toLowerCase()))
    )
      return false
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
  }
  return sorted
})
