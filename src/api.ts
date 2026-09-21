import type { Category, Item, Location } from './types'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function fetchItems(): Promise<Item[]> {
  return fetch('/api/items').then((res) => handle<Item[]>(res))
}

export interface ItemInput {
  name: string
  category: Category
  location: Location
  servings: number
  image?: File | null
}

function toFormData(input: Partial<ItemInput> & { removeImage?: boolean }): FormData {
  const form = new FormData()
  if (input.name !== undefined) form.set('name', input.name)
  if (input.category !== undefined) form.set('category', input.category)
  if (input.location !== undefined) form.set('location', input.location)
  if (input.servings !== undefined) form.set('servings', String(input.servings))
  if (input.image) form.set('image', input.image)
  if (input.removeImage) form.set('removeImage', 'true')
  return form
}

export function createItem(input: ItemInput): Promise<Item> {
  return fetch('/api/items', {
    method: 'POST',
    body: toFormData(input),
  }).then((res) => handle<Item>(res))
}

export function updateItem(
  id: number,
  input: Partial<ItemInput> & { removeImage?: boolean },
): Promise<Item> {
  return fetch(`/api/items/${id}`, {
    method: 'PATCH',
    body: toFormData(input),
  }).then((res) => handle<Item>(res))
}

export function updateServings(id: number, delta: number): Promise<{ servings: number }> {
  return fetch(`/api/items/${id}/servings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  }).then((res) => handle<{ servings: number }>(res))
}

export function deleteItem(id: number): Promise<void> {
  return fetch(`/api/items/${id}`, { method: 'DELETE' }).then((res) => handle<void>(res))
}
