// Thin fetch wrapper around the backend API (chunk 03). Stand-in for this chunk (08) — kept
// minimal since chunk 05 is the one that owns this file for real.

import type { Category, Item, Location } from './types'

const BASE = '/api/items'

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`Failed to fetch items (${res.status})`)
  return res.json()
}

export interface ItemInput {
  name: string
  category: Category
  location: Location
  servings: number
  image?: File | null
  removeImage?: boolean
}

function toFormData(input: Partial<ItemInput>): FormData {
  const fd = new FormData()
  if (input.name !== undefined) fd.set('name', input.name)
  if (input.category !== undefined) fd.set('category', input.category)
  if (input.location !== undefined) fd.set('location', input.location)
  if (input.servings !== undefined) fd.set('servings', String(input.servings))
  if (input.image) fd.set('image', input.image)
  if (input.removeImage) fd.set('removeImage', 'true')
  return fd
}

export async function createItem(input: ItemInput): Promise<Item> {
  const res = await fetch(BASE, { method: 'POST', body: toFormData(input) })
  if (!res.ok) throw new Error(`Failed to create item (${res.status})`)
  return res.json()
}

export async function updateItem(id: number, input: Partial<ItemInput>): Promise<Item> {
  const res = await fetch(`${BASE}/${id}`, { method: 'PATCH', body: toFormData(input) })
  if (!res.ok) throw new Error(`Failed to update item (${res.status})`)
  return res.json()
}

export async function updateServings(id: number, delta: number): Promise<{ servings: number }> {
  const res = await fetch(`${BASE}/${id}/servings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  })
  if (!res.ok) throw new Error(`Failed to update servings (${res.status})`)
  return res.json()
}

export async function deleteItem(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete item (${res.status})`)
}
