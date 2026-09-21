export interface Item {
  id: number;
  name: string;
  tags: string[];
  servings: number;
  image_filename: string | null;
  created_at: string;
  updated_at: string;
}
