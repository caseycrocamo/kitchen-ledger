export type ItemCategory = 'main' | 'side';

export type ItemLocation = 'fridge' | 'freezer';

export interface Item {
  id: number;
  name: string;
  category: ItemCategory;
  location: ItemLocation;
  servings: number;
  image_filename: string | null;
  created_at: string;
  updated_at: string;
}
