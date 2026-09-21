// Frontend-side duplicate of the backend `Item` interface (see server/src/types.ts, chunk 02).
// Stand-in for this chunk (08) — chunk 02 owns the real/shared definition.

export type Category = 'main' | 'side'
export type Location = 'fridge' | 'freezer'

export interface Item {
  id: number
  name: string
  category: Category
  location: Location
  servings: number
  image_filename: string | null
  created_at: string
  updated_at: string
}
