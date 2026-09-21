export interface Item {
  id: number;
  name: string;
  tags: string[];
  servings: number;
  image_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServingsPerDay {
  date: string;
  consumed: number;
}

export interface AgePerDay {
  date: string;
  avgAgeDays: number | null;
}

export type Insight =
  | {
      type: 'restock';
      itemId: number;
      itemName: string;
      servings: number;
      daysUntilEmpty: number;
      message: string;
    }
  | {
      type: 'aging';
      itemId: number;
      itemName: string;
      servings: number;
      ageDays: number;
      message: string;
    }
