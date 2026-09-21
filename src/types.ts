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
