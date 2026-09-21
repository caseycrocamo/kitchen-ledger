import { computed, signal } from '@preact/signals'
import type { Item } from './types'

export const items = signal<Item[]>([])
export const itemsLoading = signal(true)
export const itemsError = signal<string | null>(null)

export const searchQuery = signal('')
export const categoryFilter = signal<'all' | 'main' | 'side'>('all')
export const locationFilter = signal<'all' | 'fridge' | 'freezer'>('all')
export const sortBy = signal<'name' | 'created_at'>('name')

// Full filter/sort logic lands in chunk 08 — pass-through for now.
export const visibleItems = computed(() => items.value)
