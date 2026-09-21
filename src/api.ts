import type { Item } from './types'

const BASE = '/api/items'

export interface ItemInput {
  name: string
  category: Item['category']
  location: Item['location']
  servings: number
  image?: File | null
  removeImage?: boolean
}

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `${fallbackMessage} (${res.status})`)
  }
  return res.json() as Promise<T>
}

function toFormData(input: Partial<ItemInput>): FormData {
  const formData = new FormData()
  if (input.name !== undefined) formData.set('name', input.name)
  if (input.category !== undefined) formData.set('category', input.category)
  if (input.location !== undefined) formData.set('location', input.location)
  if (input.servings !== undefined) formData.set('servings', String(input.servings))
  if (input.image) formData.set('image', input.image)
  if (input.removeImage) formData.set('removeImage', 'true')
  return formData
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(BASE)
  return parseJsonOrThrow<Item[]>(res, 'Failed to load items')
}

export async function createItem(input: ItemInput): Promise<Item> {
  const res = await fetch(BASE, {
    method: 'POST',
    body: toFormData(input),
  })
  return parseJsonOrThrow<Item>(res, 'Failed to create item')
}

export async function updateItem(id: number, input: Partial<ItemInput>): Promise<Item> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    body: toFormData(input),
  })
  return parseJsonOrThrow<Item>(res, 'Failed to update item')
}

export async function updateServings(id: number, delta: number): Promise<{ servings: number }> {
  const res = await fetch(`${BASE}/${id}/servings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  })
  return parseJsonOrThrow<{ servings: number }>(res, 'Failed to update servings')
}

export async function deleteItem(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `Failed to delete item (${res.status})`)
  }
}
