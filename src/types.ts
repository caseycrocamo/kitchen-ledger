export interface Item {
  id: number
  name: string
  category: 'main' | 'side'
  location: 'fridge' | 'freezer'
  servings: number
  image_filename: string | null
  created_at: string
  updated_at: string
}
