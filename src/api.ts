import type { Item } from './types'

export interface ItemInput {
  name: string
  category: Item['category']
  location: Item['location']
  servings: number
  image?: File | null
}

export interface ItemUpdateInput extends Partial<ItemInput> {
  removeImage?: boolean
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function toFormData(input: ItemInput | ItemUpdateInput): FormData {
  const formData = new FormData()
  if (input.name !== undefined) formData.set('name', input.name)
  if (input.category !== undefined) formData.set('category', input.category)
  if (input.location !== undefined) formData.set('location', input.location)
  if (input.servings !== undefined) formData.set('servings', String(input.servings))
  if (input.image) formData.set('image', input.image)
  if ('removeImage' in input && input.removeImage) formData.set('removeImage', 'true')
  return formData
}

export function fetchItems(): Promise<Item[]> {
  return request<Item[]>('/api/items')
}

export function createItem(input: ItemInput): Promise<Item> {
  return request<Item>('/api/items', {
    method: 'POST',
    body: toFormData(input),
  })
}

export function updateItem(id: number, input: ItemUpdateInput): Promise<Item> {
  return request<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    body: toFormData(input),
  })
}

export function updateServings(id: number, delta: number): Promise<{ servings: number }> {
  return request<{ servings: number }>(`/api/items/${id}/servings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  })
}

export function deleteItem(id: number): Promise<void> {
  return request<void>(`/api/items/${id}`, { method: 'DELETE' })
}
