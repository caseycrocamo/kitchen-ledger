// Thin fetch wrapper around the backend API (see plans/meal-ledger/03-backend-api.md).
// Stand-in for chunk 05 — kept minimal, just enough for the item form (chunk 07) to work
// end-to-end.

import type { Category, Item, Location } from './types'

const BASE = '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') return body.error
    if (body && typeof body.message === 'string') return body.message
  } catch {
    // response wasn't JSON — fall through to the generic message
  }
  return `Request failed with status ${res.status}`
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status)
  }
  return (await res.json()) as T
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${BASE}/items`)
  return handleJson<Item[]>(res)
}

export interface ItemFormFields {
  name: string
  category: Category
  location: Location
  servings: number
  /** A newly-selected file to upload. Omit/undefined to leave the image unchanged. */
  image?: File | null
  /** Clear the existing image without uploading a replacement. */
  removeImage?: boolean
}

function toFormData(fields: Partial<ItemFormFields>): FormData {
  const formData = new FormData()
  if (fields.name !== undefined) formData.set('name', fields.name)
  if (fields.category !== undefined) formData.set('category', fields.category)
  if (fields.location !== undefined) formData.set('location', fields.location)
  if (fields.servings !== undefined) formData.set('servings', String(fields.servings))
  if (fields.image) formData.set('image', fields.image)
  if (fields.removeImage) formData.set('removeImage', 'true')
  return formData
}

export async function createItem(fields: ItemFormFields): Promise<Item> {
  const res = await fetch(`${BASE}/items`, {
    method: 'POST',
    body: toFormData(fields),
  })
  return handleJson<Item>(res)
}

export async function updateItem(id: number, fields: Partial<ItemFormFields>): Promise<Item> {
  const res = await fetch(`${BASE}/items/${id}`, {
    method: 'PATCH',
    body: toFormData(fields),
  })
  return handleJson<Item>(res)
}

export async function updateServings(id: number, delta: number): Promise<{ servings: number }> {
  const res = await fetch(`${BASE}/items/${id}/servings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  })
  return handleJson<{ servings: number }>(res)
}

export async function deleteItem(id: number): Promise<void> {
  const res = await fetch(`${BASE}/items/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status)
  }
}
